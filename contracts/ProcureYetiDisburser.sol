// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IERC20
 * @notice Minimal ERC-20 interface for USDC interactions on Celo Sepolia
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title SafeERC20
 * @notice Safe wrappers around ERC-20 operations to support non-standard return values
 */
library SafeERC20 {
    error SafeERC20FailedOperation(address token);

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        (bool success, bytes memory returndata) = address(token).call(
            abi.encodeCall(token.transfer, (to, value))
        );
        if (!success || (returndata.length != 0 && !abi.decode(returndata, (bool)))) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        (bool success, bytes memory returndata) = address(token).call(
            abi.encodeCall(token.transferFrom, (from, to, value))
        );
        if (!success || (returndata.length != 0 && !abi.decode(returndata, (bool)))) {
            revert SafeERC20FailedOperation(address(token));
        }
    }
}

/**
 * @title ProcureYetiDisburser
 * @notice Owner-governed procurement payment router for ProcureYeti Celo.
 *
 * CORE ARCHITECTURAL PRINCIPLE:
 * "AI recommends. Owners authorize. Celo enforces."
 *
 * SAFETY GUARANTEES:
 * 1. Supplier Whitelisting: ONLY owner-approved suppliers can receive disbursements.
 *    Any transaction attempting payment to an unapproved recipient reverts on-chain.
 * 2. Spend Velocity Caps: Enforces single-payment limits, daily velocity caps, and
 *    autonomous agent thresholds.
 * 3. Altana Session Alignment: Scopes Altana Agent Wallet session permissions to:
 *    { to: disburserAddress, signature: "disbursePayment(address,uint256,string)" }
 *    This completely prevents the agent session from transferring funds to arbitrary addresses.
 * 4. Reentrancy & SafeERC20 Protection: Reentrancy locked with safe token handling.
 */
contract ProcureYetiDisburser {
    using SafeERC20 for IERC20;

    // --- State Variables ---

    /// @notice Owner of the disburser contract (human business owner / multi-sig)
    address public owner;

    /// @notice Verified USDC Token contract on Celo Sepolia (6 decimals)
    IERC20 public immutable usdc;

    /// @notice Maximum allowed amount for a single payment (in raw token units, 6 decimals)
    uint256 public maxSinglePayment;

    /// @notice Maximum allowed disbursements across a 24-hour window (in raw token units)
    uint256 public dailyVelocityCap;

    /// @notice Maximum amount an authorized agent can disburse autonomously without owner signature
    uint256 public autonomousThreshold;

    /// @notice Total volume disbursed across all suppliers
    uint256 public totalDisbursedOverall;

    /// @notice Reentrancy lock state
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    /// @notice Mapping of approved supplier addresses
    mapping(address => bool) public isApprovedSupplier;

    /// @notice Mapping of supplier human-readable business names
    mapping(address => string) public supplierNames;

    /// @notice Cumulative volume disbursed to a specific supplier
    mapping(address => uint256) public totalDisbursedToSupplier;

    /// @notice Authorized agent addresses (e.g. Altana smart account / agent wallet)
    mapping(address => bool) public isAuthorizedAgent;

    /// @notice Daily spent tracking: (dayIndex => amountSpent)
    mapping(uint256 => uint256) public dailySpent;

    // --- Events ---

    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);
    event SupplierApproved(address indexed supplier, string name, uint256 timestamp);
    event SupplierRevoked(address indexed supplier, uint256 timestamp);
    event AgentAuthorizationChanged(address indexed agent, bool authorized);
    event SpendingLimitsUpdated(
        uint256 maxSinglePayment,
        uint256 dailyVelocityCap,
        uint256 autonomousThreshold
    );
    event PaymentDisbursed(
        address indexed supplier,
        uint256 amount,
        string requisitionId,
        address indexed caller,
        uint256 timestamp
    );
    event TreasuryDeposited(address indexed depositor, uint256 amount);
    event EmergencyWithdrawal(address indexed token, address indexed recipient, uint256 amount);

    // --- Custom Errors ---

    error Unauthorized(address caller);
    error InvalidAddress();
    error InvalidAmount();
    error SupplierNotApproved(address supplier);
    error SupplierAlreadyApproved(address supplier);
    error PaymentExceedsSingleCap(uint256 amount, uint256 maxSinglePayment);
    error PaymentExceedsDailyCap(uint256 amount, uint256 remainingToday);
    error PaymentExceedsAutonomousCap(uint256 amount, uint256 autonomousThreshold);
    error InsufficientContractBalance(uint256 requested, uint256 available);
    error ReentrancyGuardReentrantCall();

    // --- Modifiers ---

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != owner && !isAuthorizedAgent[msg.sender]) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrancyGuardReentrantCall();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // --- Constructor ---

    /**
     * @param _usdc Verified USDC contract address on Celo Sepolia (0x01C5C0122039549AD1493B8220cABEdD739BC44E)
     * @param _maxSinglePayment Maximum single transaction cap in USDC (e.g. 2,500 USDC = 2500000000)
     * @param _dailyVelocityCap 24h rolling velocity cap in USDC (e.g. 5,000 USDC = 5000000000)
     * @param _autonomousThreshold Agent autonomous cap in USDC (e.g. 500 USDC = 500000000)
     */
    constructor(
        address _usdc,
        uint256 _maxSinglePayment,
        uint256 _dailyVelocityCap,
        uint256 _autonomousThreshold
    ) {
        if (_usdc == address(0)) revert InvalidAddress();
        if (_maxSinglePayment == 0 || _dailyVelocityCap == 0 || _autonomousThreshold == 0) {
            revert InvalidAmount();
        }
        if (_autonomousThreshold > _maxSinglePayment || _maxSinglePayment > _dailyVelocityCap) {
            revert InvalidAmount();
        }

        owner = msg.sender;
        usdc = IERC20(_usdc);
        maxSinglePayment = _maxSinglePayment;
        dailyVelocityCap = _dailyVelocityCap;
        autonomousThreshold = _autonomousThreshold;
        _reentrancyStatus = _NOT_ENTERED;

        emit OwnerTransferred(address(0), msg.sender);
        emit SpendingLimitsUpdated(_maxSinglePayment, _dailyVelocityCap, _autonomousThreshold);
    }

    // --- Supplier Allowlist Management (Owner Only) ---

    /**
     * @notice Adds or updates an approved supplier in the disburser allowlist.
     */
    function approveSupplier(address supplier, string calldata name) external onlyOwner {
        if (supplier == address(0)) revert InvalidAddress();
        isApprovedSupplier[supplier] = true;
        supplierNames[supplier] = name;
        emit SupplierApproved(supplier, name, block.timestamp);
    }

    /**
     * @notice Batch approves multiple suppliers.
     */
    function approveSuppliersBatch(
        address[] calldata suppliers,
        string[] calldata names
    ) external onlyOwner {
        if (suppliers.length != names.length) revert InvalidAmount();
        for (uint256 i = 0; i < suppliers.length; i++) {
            address s = suppliers[i];
            if (s == address(0)) revert InvalidAddress();
            isApprovedSupplier[s] = true;
            supplierNames[s] = names[i];
            emit SupplierApproved(s, names[i], block.timestamp);
        }
    }

    /**
     * @notice Revokes a supplier, preventing any future disbursements.
     */
    function revokeSupplier(address supplier) external onlyOwner {
        if (!isApprovedSupplier[supplier]) revert SupplierNotApproved(supplier);
        isApprovedSupplier[supplier] = false;
        emit SupplierRevoked(supplier, block.timestamp);
    }

    // --- Spending Limits & Agent Access (Owner Only) ---

    /**
     * @notice Updates the disburser spend limits.
     */
    function setSpendingLimits(
        uint256 _maxSinglePayment,
        uint256 _dailyVelocityCap,
        uint256 _autonomousThreshold
    ) external onlyOwner {
        if (_maxSinglePayment == 0 || _dailyVelocityCap == 0 || _autonomousThreshold == 0) {
            revert InvalidAmount();
        }
        if (_autonomousThreshold > _maxSinglePayment || _maxSinglePayment > _dailyVelocityCap) {
            revert InvalidAmount();
        }

        maxSinglePayment = _maxSinglePayment;
        dailyVelocityCap = _dailyVelocityCap;
        autonomousThreshold = _autonomousThreshold;

        emit SpendingLimitsUpdated(_maxSinglePayment, _dailyVelocityCap, _autonomousThreshold);
    }

    /**
     * @notice Authorizes or de-authorizes an agent address (e.g. Altana Smart Account).
     */
    function setAuthorizedAgent(address agent, bool authorized) external onlyOwner {
        if (agent == address(0)) revert InvalidAddress();
        isAuthorizedAgent[agent] = authorized;
        emit AgentAuthorizationChanged(agent, authorized);
    }

    /**
     * @notice Transfers ownership of the disburser contract.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerTransferred(oldOwner, newOwner);
    }

    // --- Payment Execution ---

    /**
     * @notice Disburses USDC payment to an owner-approved supplier.
     * @dev Called by authorized Altana agents (under autonomousThreshold) or by the owner.
     * @param supplier The approved recipient address.
     * @param amount The disbursement amount in 6-decimal USDC units.
     * @param requisitionId ProcureYeti requisition identifier (e.g. "PR-2026-081").
     */
    function disbursePayment(
        address supplier,
        uint256 amount,
        string calldata requisitionId
    ) external onlyAuthorized nonReentrant returns (bool) {
        if (amount == 0) revert InvalidAmount();

        // 1. Strict Supplier Whitelist Check
        if (!isApprovedSupplier[supplier]) {
            revert SupplierNotApproved(supplier);
        }

        // 2. Single Payment Limit Check
        if (amount > maxSinglePayment) {
            revert PaymentExceedsSingleCap(amount, maxSinglePayment);
        }

        // 3. Autonomous Threshold Check for Agents
        // If caller is an agent (not the owner), amount must not exceed autonomousThreshold
        if (msg.sender != owner && amount > autonomousThreshold) {
            revert PaymentExceedsAutonomousCap(amount, autonomousThreshold);
        }

        // 4. Daily Velocity Cap Check
        uint256 today = block.timestamp / 1 days;
        uint256 spentToday = dailySpent[today];
        if (spentToday + amount > dailyVelocityCap) {
            uint256 remaining = dailyVelocityCap > spentToday ? dailyVelocityCap - spentToday : 0;
            revert PaymentExceedsDailyCap(amount, remaining);
        }

        // 5. Contract Liquidity Check
        uint256 balance = usdc.balanceOf(address(this));
        if (balance < amount) {
            revert InsufficientContractBalance(amount, balance);
        }

        // 6. State Updates
        dailySpent[today] = spentToday + amount;
        totalDisbursedToSupplier[supplier] += amount;
        totalDisbursedOverall += amount;

        // 7. Disburse Tokens
        usdc.safeTransfer(supplier, amount);

        emit PaymentDisbursed(supplier, amount, requisitionId, msg.sender, block.timestamp);
        return true;
    }

    // --- Treasury Funding & Emergency ---

    /**
     * @notice Allows depositing USDC into the disburser contract balance.
     */
    function depositTreasury(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit TreasuryDeposited(msg.sender, amount);
    }

    /**
     * @notice Emergency retrieval of funds (Owner only).
     */
    function emergencyWithdraw(
        address tokenAddress,
        address recipient,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        IERC20(tokenAddress).safeTransfer(recipient, amount);
        emit EmergencyWithdrawal(tokenAddress, recipient, amount);
    }

    // --- View Helpers ---

    /**
     * @notice Returns remaining spending capacity in the current 24h window.
     */
    function getRemainingDailyCapacity() external view returns (uint256) {
        uint256 today = block.timestamp / 1 days;
        uint256 spentToday = dailySpent[today];
        if (spentToday >= dailyVelocityCap) return 0;
        return dailyVelocityCap - spentToday;
    }

    /**
     * @notice Inspects whether a specific supplier is approved.
     */
    function isSupplierApproved(address supplier) external view returns (bool) {
        return isApprovedSupplier[supplier];
    }
}
