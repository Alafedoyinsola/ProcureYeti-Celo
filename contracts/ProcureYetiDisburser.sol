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

    // --- Data Types ---

    /// @notice Struct representing an owner-created Purchase Mandate
    struct PurchaseMandate {
        bytes32 mandateId;
        address supplier;
        uint256 maxAmount;
        string requisitionId;
        uint256 expiry;
        bool isUsed;
        bool isRevoked;
        uint256 createdAt;
    }

    // --- State Variables ---

    /// @notice Owner of the disburser contract (human business owner / multi-sig)
    address public owner;

    /// @notice Verified native Circle USDC Token contract on Celo (6 decimals)
    IERC20 public immutable usdc;

    /// @notice Maximum allowed amount for a single payment (in raw token units, 6 decimals)
    uint256 public maxSinglePayment;

    /// @notice Maximum allowed disbursements across a UTC calendar day (in raw token units, block.timestamp / 1 days)
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

    /// @notice Mapping of unique mandate ID to purchase mandate record
    mapping(bytes32 => PurchaseMandate) public mandates;

    /// @notice Cumulative count of created purchase mandates
    uint256 public mandateCount;

    /// @notice Cumulative count of executed purchase mandates
    uint256 public executedMandateCount;

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

    // Mandate Events
    event MandateCreated(
        bytes32 indexed mandateId,
        address indexed supplier,
        uint256 maxAmount,
        string requisitionId,
        uint256 expiry,
        uint256 timestamp
    );
    event MandateRevoked(
        bytes32 indexed mandateId,
        address indexed supplier,
        uint256 timestamp
    );
    event MandateExecuted(
        bytes32 indexed mandateId,
        address indexed supplier,
        uint256 amount,
        string requisitionId,
        address indexed caller,
        uint256 timestamp
    );

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

    // Mandate Custom Errors
    error MandateNotFound(bytes32 mandateId);
    error MandateAlreadyExists(bytes32 mandateId);
    error MandateAlreadyUsed(bytes32 mandateId);
    error MandateAlreadyRevoked(bytes32 mandateId);
    error MandateExpired(uint256 expiry, uint256 currentTimestamp);
    error MandateSupplierMismatch(address expectedSupplier, address providedSupplier);
    error MandateRequisitionMismatch(string expectedRequisitionId, string providedRequisitionId);
    error MandateAmountExceeded(uint256 requestedAmount, uint256 maxAuthorizedAmount);
    error MandateInvalidExpiry(uint256 expiry, uint256 currentTimestamp);
    error MandateInvalidId();

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
     * @param _usdc Verified USDC contract address (Celo Mainnet: 0xcebA9300f2b948710d2653dD7B07f33A8B32118C, Celo Sepolia: 0x01C5C0122039549AD1493B8220cABEdD739BC44E)
     * @param _maxSinglePayment Maximum single transaction cap in USDC (e.g. 2,500 USDC = 2500000000)
     * @param _dailyVelocityCap UTC calendar-day velocity cap in USDC (e.g. 5,000 USDC = 5000000000, block.timestamp / 1 days)
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

    // --- Purchase Mandate Governance (Owner Only) ---

    /**
     * @notice Creates an owner-authorized Purchase Mandate for a specific purchase.
     * @param mandateId Unique bytes32 identifier for this mandate.
     * @param supplier Pre-approved recipient address.
     * @param maxAmount Maximum authorized payment amount in 6-decimal USDC units.
     * @param requisitionId Exact ProcureYeti requisition ID bound to this purchase.
     * @param expiry Expiration timestamp (UNIX seconds).
     */
    function createMandate(
        bytes32 mandateId,
        address supplier,
        uint256 maxAmount,
        string calldata requisitionId,
        uint256 expiry
    ) external onlyOwner {
        if (mandateId == bytes32(0)) revert MandateInvalidId();
        if (mandates[mandateId].mandateId != bytes32(0)) revert MandateAlreadyExists(mandateId);
        if (supplier == address(0)) revert InvalidAddress();
        if (!isApprovedSupplier[supplier]) revert SupplierNotApproved(supplier);
        if (maxAmount == 0) revert InvalidAmount();
        if (maxAmount > maxSinglePayment) revert PaymentExceedsSingleCap(maxAmount, maxSinglePayment);
        if (expiry <= block.timestamp) revert MandateInvalidExpiry(expiry, block.timestamp);
        if (bytes(requisitionId).length == 0) revert InvalidAmount();

        mandates[mandateId] = PurchaseMandate({
            mandateId: mandateId,
            supplier: supplier,
            maxAmount: maxAmount,
            requisitionId: requisitionId,
            expiry: expiry,
            isUsed: false,
            isRevoked: false,
            createdAt: block.timestamp
        });
        mandateCount++;

        emit MandateCreated(mandateId, supplier, maxAmount, requisitionId, expiry, block.timestamp);
    }

    /**
     * @notice Revokes an active Purchase Mandate, preventing execution.
     * @param mandateId Unique identifier of the mandate to revoke.
     */
    function revokeMandate(bytes32 mandateId) external onlyOwner {
        PurchaseMandate storage m = mandates[mandateId];
        if (m.mandateId == bytes32(0)) revert MandateNotFound(mandateId);
        if (m.isUsed) revert MandateAlreadyUsed(mandateId);
        if (m.isRevoked) revert MandateAlreadyRevoked(mandateId);

        m.isRevoked = true;

        emit MandateRevoked(mandateId, m.supplier, block.timestamp);
    }

    // --- Purchase Mandate Execution ---

    /**
     * @notice Disburses USDC payment strictly governed by an owner-created Purchase Mandate.
     * @dev Accessible by authorized Altana agents or the contract owner.
     * @param mandateId Unique identifier of the approved mandate.
     * @param supplier Pre-approved recipient address (must match mandate supplier).
     * @param amount Payment amount in 6-decimal USDC units (must not exceed mandate maxAmount).
     * @param requisitionId ProcureYeti requisition identifier (must match mandate requisitionId).
     */
    function disburseWithMandate(
        bytes32 mandateId,
        address supplier,
        uint256 amount,
        string calldata requisitionId
    ) external nonReentrant onlyAuthorized returns (bool) {
        return _executeMandatePayment(mandateId, supplier, amount, requisitionId);
    }

    /**
     * @notice Execution alias for disburseWithMandate.
     */
    function executeMandatePayment(
        bytes32 mandateId,
        address supplier,
        uint256 amount,
        string calldata requisitionId
    ) external nonReentrant onlyAuthorized returns (bool) {
        return _executeMandatePayment(mandateId, supplier, amount, requisitionId);
    }

    function _executeMandatePayment(
        bytes32 mandateId,
        address supplier,
        uint256 amount,
        string calldata requisitionId
    ) internal returns (bool) {
        if (amount == 0) revert InvalidAmount();

        // 1. Mandate Existence & Lifecycle Checks
        PurchaseMandate storage m = mandates[mandateId];
        if (m.mandateId == bytes32(0)) revert MandateNotFound(mandateId);
        if (m.isUsed) revert MandateAlreadyUsed(mandateId);
        if (m.isRevoked) revert MandateAlreadyRevoked(mandateId);
        if (block.timestamp > m.expiry) revert MandateExpired(m.expiry, block.timestamp);

        // 2. Strict Supplier Match & Approval Checks
        if (supplier != m.supplier) {
            revert MandateSupplierMismatch(m.supplier, supplier);
        }
        if (!isApprovedSupplier[supplier]) {
            revert SupplierNotApproved(supplier);
        }

        // 3. Exact Requisition Identifier Match
        if (keccak256(bytes(requisitionId)) != keccak256(bytes(m.requisitionId))) {
            revert MandateRequisitionMismatch(m.requisitionId, requisitionId);
        }

        // 4. Mandate Maximum Authorized Amount Check
        if (amount > m.maxAmount) {
            revert MandateAmountExceeded(amount, m.maxAmount);
        }

        // 5. Existing Single Payment Cap Check
        if (amount > maxSinglePayment) {
            revert PaymentExceedsSingleCap(amount, maxSinglePayment);
        }

        // 6. Existing Autonomous Threshold Check for Agents
        if (msg.sender != owner && amount > autonomousThreshold) {
            revert PaymentExceedsAutonomousCap(amount, autonomousThreshold);
        }

        // 7. Existing Daily Velocity Cap Check
        uint256 today = block.timestamp / 1 days;
        uint256 spentToday = dailySpent[today];
        if (spentToday + amount > dailyVelocityCap) {
            uint256 remaining = dailyVelocityCap > spentToday ? dailyVelocityCap - spentToday : 0;
            revert PaymentExceedsDailyCap(amount, remaining);
        }

        // 8. Contract Treasury Liquidity Check
        uint256 balance = usdc.balanceOf(address(this));
        if (balance < amount) {
            revert InsufficientContractBalance(amount, balance);
        }

        // 9. State Updates (CRITICAL: Mark mandate as used BEFORE external token transfer)
        m.isUsed = true;
        executedMandateCount++;
        dailySpent[today] = spentToday + amount;
        totalDisbursedToSupplier[supplier] += amount;
        totalDisbursedOverall += amount;

        // 10. Disburse Tokens via SafeERC20
        usdc.safeTransfer(supplier, amount);

        // 11. Emit Events
        emit MandateExecuted(mandateId, supplier, amount, requisitionId, msg.sender, block.timestamp);
        emit PaymentDisbursed(supplier, amount, requisitionId, msg.sender, block.timestamp);

        return true;
    }

    // --- Payment Execution ---

    /**
     * @notice Legacy disbursement entry point preserved for interface backwards compatibility.
     * @dev Strictly enforces Purchase Mandate governance by deriving the mandate ID from (requisitionId, supplier).
     * All payment entry points in ProcureYetiDisburser enforce the exact same mandate, supplier whitelist,
     * autonomous agent threshold, single payment cap, and daily velocity cap.
     * @param supplier The approved recipient address.
     * @param amount The disbursement amount in 6-decimal USDC units.
     * @param requisitionId ProcureYeti requisition identifier (e.g. "PR-2026-081").
     */
    function disbursePayment(
        address supplier,
        uint256 amount,
        string calldata requisitionId
    ) external nonReentrant onlyAuthorized returns (bool) {
        bytes32 mandateId = keccak256(abi.encodePacked(requisitionId, supplier));
        return _executeMandatePayment(mandateId, supplier, amount, requisitionId);
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
     * @notice Returns remaining spending capacity in the current UTC calendar day (block.timestamp / 1 days).
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

    /**
     * @notice Reads a Purchase Mandate record by its unique ID.
     */
    function getMandate(bytes32 mandateId) external view returns (PurchaseMandate memory) {
        PurchaseMandate memory m = mandates[mandateId];
        if (m.mandateId == bytes32(0)) revert MandateNotFound(mandateId);
        return m;
    }

    /**
     * @notice Checks whether a Purchase Mandate is currently active, unexpired, and executable.
     */
    function isMandateExecutable(bytes32 mandateId) external view returns (bool) {
        PurchaseMandate storage m = mandates[mandateId];
        if (m.mandateId == bytes32(0)) return false;
        if (m.isUsed || m.isRevoked) return false;
        if (block.timestamp > m.expiry) return false;
        if (!isApprovedSupplier[m.supplier]) return false;
        return true;
    }

    /**
     * @notice Checks whether a Purchase Mandate is currently executable for a specific payment amount.
     */
    function isMandateExecutable(bytes32 mandateId, uint256 amount) external view returns (bool) {
        PurchaseMandate storage m = mandates[mandateId];
        if (m.mandateId == bytes32(0)) return false;
        if (m.isUsed || m.isRevoked) return false;
        if (block.timestamp > m.expiry) return false;
        if (!isApprovedSupplier[m.supplier]) return false;
        if (amount == 0 || amount > m.maxAmount) return false;
        if (amount > maxSinglePayment) return false;

        uint256 today = block.timestamp / 1 days;
        if (dailySpent[today] + amount > dailyVelocityCap) return false;
        if (usdc.balanceOf(address(this)) < amount) return false;

        return true;
    }
}
