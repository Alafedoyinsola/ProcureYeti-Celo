
/**
 * ProcureYetiDisburser Deployment & Preparation Script
 * Network: Celo Sepolia
 *
 * SAFETY:
 * 1. Default mode is DRY-RUN. No transactions are signed or broadcast.
 * 2. Live deployment requires --broadcast and a deployer private key.
 * 3. Live deployment verifies the RPC chain ID.
 * 4. Live deployment verifies USDC contract bytecode and 6 decimals.
 * 5. Deployment receipt must confirm successful contract creation.
 *
 * IMPORTANT:
 * This script targets Celo Sepolia (11142220), not Celo Mainnet.
 */

const fs = require('fs');
const path = require('path');
const solc = require('solc');

const {
  parseUnits,
  formatUnits,
  encodeDeployData,
  encodeAbiParameters,
  parseAbiParameters,
  createWalletClient,
  createPublicClient,
  http,
} = require('viem');

const { privateKeyToAccount } = require('viem/accounts');
const { celoSepolia } = require('viem/chains');

// ============================================================
// 1. NETWORK CONFIGURATION
// ============================================================

const CELO_SEPOLIA_CHAIN_ID = 11142220;

const CELO_SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC ||
  'https://forno.celo-sepolia.celo-testnet.org';

// Verify this address independently before any live deployment.
const CELO_SEPOLIA_USDC =
  '0x01C5C0122039549AD1493B8220cABEdD739BC44E';

const EXPECTED_USDC_DECIMALS = 6;

// ============================================================
// 2. GOVERNANCE LIMITS
// ============================================================

const MAX_SINGLE_PAYMENT = parseUnits('2500', 6);
const DAILY_VELOCITY_CAP = parseUnits('5000', 6);
const AUTONOMOUS_THRESHOLD = parseUnits('500', 6);

// ============================================================
// 3. USDC VALIDATION ABI
// ============================================================

const USDC_VALIDATION_ABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
];

// ============================================================
// 4. MAIN
// ============================================================

async function main() {
  const isBroadcast = process.argv.includes('--broadcast');

  console.log('\n===============================================================');
  console.log('       ProcureYetiDisburser - Celo Sepolia Deployment');
  console.log('===============================================================');
  console.log('Target Network:     Celo Sepolia');
  console.log('Expected Chain ID:  ', CELO_SEPOLIA_CHAIN_ID);
  console.log('RPC Endpoint:       ', CELO_SEPOLIA_RPC);
  console.log('USDC Address:       ', CELO_SEPOLIA_USDC);
  console.log('EVM Target:         cancun');
  console.log('Solidity Optimizer: enabled (200 runs)');
  console.log(
    'Execution Mode:     ',
    isBroadcast ? 'LIVE BROADCAST REQUESTED' : 'DRY-RUN PREPARATION'
  );
  console.log('---------------------------------------------------------------\n');

  // ==========================================================
  // STEP 1: VERIFY SOLIDITY COMPILER
  // ==========================================================

  const compilerVersion = solc.version();

  console.log('Solidity Compiler:', compilerVersion);

  if (!compilerVersion.startsWith('0.8.28+')) {
    throw new Error(
      `Unexpected Solidity compiler version: ${compilerVersion}. Expected 0.8.28.`
    );
  }

  // ==========================================================
  // STEP 2: READ AND COMPILE CONTRACT
  // ==========================================================

  const contractPath = path.join(
    __dirname,
    '../contracts/ProcureYetiDisburser.sol'
  );

  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract file not found: ${contractPath}`);
  }

  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'ProcureYetiDisburser.sol': {
        content: source,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'cancun',
      outputSelection: {
        '*': {
          '*': [
            'abi',
            'evm.bytecode',
            'evm.deployedBytecode',
          ],
        },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input))
  );

  if (output.errors) {
    const errors = output.errors.filter(
      (error) => error.severity === 'error'
    );

    if (errors.length > 0) {
      throw new Error(
        'Solidity compilation failed:\n' +
          errors.map((error) => error.formattedMessage).join('\n')
      );
    }
  }

  const compiledContract =
    output.contracts?.['ProcureYetiDisburser.sol']?.[
      'ProcureYetiDisburser'
    ];

  if (!compiledContract) {
    throw new Error(
      'ProcureYetiDisburser contract was not found in compiler output.'
    );
  }

  const abi = compiledContract.abi;
  const bytecode = `0x${compiledContract.evm.bytecode.object}`;
  const deployedBytecode =
    `0x${compiledContract.evm.deployedBytecode.object}`;

  if (bytecode === '0x') {
    throw new Error('Compiled deployment bytecode is empty.');
  }

  console.log('\nContract compiled successfully.');
  console.log('Creation bytecode size: ', (bytecode.length - 2) / 2, 'bytes');
  console.log(
    'Runtime bytecode size:  ',
    (deployedBytecode.length - 2) / 2,
    'bytes'
  );

  // ==========================================================
  // STEP 3: SAVE COMPILED ARTIFACT
  // ==========================================================

  const artifactPath = path.join(
    __dirname,
    '../contracts/ProcureYetiDisburser.json'
  );

  fs.writeFileSync(
    artifactPath,
    JSON.stringify(
      {
        contractName: 'ProcureYetiDisburser',
        compiler: compilerVersion,
        evmVersion: 'cancun',
        optimizer: {
          enabled: true,
          runs: 200,
        },
        abi,
        bytecode,
        deployedBytecode,
      },
      null,
      2
    )
  );

  console.log('\nCompiled artifact saved:');
  console.log('contracts/ProcureYetiDisburser.json');

  // ==========================================================
  // STEP 4: CONSTRUCTOR ARGUMENTS
  // ==========================================================

  const constructorArgs = [
    CELO_SEPOLIA_USDC,
    MAX_SINGLE_PAYMENT,
    DAILY_VELOCITY_CAP,
    AUTONOMOUS_THRESHOLD,
  ];

  const paramsDefinition = parseAbiParameters(
    'address _usdc, uint256 _maxSinglePayment, uint256 _dailyVelocityCap, uint256 _autonomousThreshold'
  );

  const encodedConstructorArgs = encodeAbiParameters(
    paramsDefinition,
    constructorArgs
  );

  const deployData = encodeDeployData({
    abi,
    bytecode,
    args: constructorArgs,
  });

  console.log('\n--- Constructor Arguments ---');
  console.log('USDC Address:          ', CELO_SEPOLIA_USDC);
  console.log('Maximum Single Payment:', formatUnits(MAX_SINGLE_PAYMENT, 6), 'USDC');
  console.log('Daily Velocity Cap:    ', formatUnits(DAILY_VELOCITY_CAP, 6), 'USDC');
  console.log('Autonomous Threshold:  ', formatUnits(AUTONOMOUS_THRESHOLD, 6), 'USDC');

  console.log('\nABI-Encoded Constructor Arguments:');
  console.log(encodedConstructorArgs);

  // ==========================================================
  // STEP 5: DRY-RUN EXIT
  // ==========================================================

  if (!isBroadcast) {
    console.log('\n===============================================================');
    console.log('                    DRY-RUN COMPLETE');
    console.log('===============================================================');
    console.log('Contract compilation: SUCCESS');
    console.log('Artifact generation: SUCCESS');
    console.log('Constructor encoding: SUCCESS');
    console.log('Transaction broadcast: NOT PERFORMED');
    console.log('\nNo wallet was loaded and no transaction was signed.');
    console.log('\nDeployment data is prepared for Celo Sepolia.');
    console.log('\nLive deployment requires a separate explicit command:');
    console.log('  node scripts/deploy-disburser.js --broadcast');
    console.log('\nThat command also requires DEPLOYER_PRIVATE_KEY.');
    console.log('===============================================================\n');

    console.log('Prepared deployment bytecode length:', deployData.length);
    return;
  }

  // ==========================================================
  // STEP 6: LIVE DEPLOYMENT GUARDS
  // ==========================================================

  const privateKey =
    process.env.DEPLOYER_PRIVATE_KEY ||
    process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      'Broadcast requested, but DEPLOYER_PRIVATE_KEY or PRIVATE_KEY is missing.'
    );
  }

  const formattedKey = privateKey.startsWith('0x')
    ? privateKey
    : `0x${privateKey}`;

  if (!/^0x[0-9a-fA-F]{64}$/.test(formattedKey)) {
    throw new Error('The supplied deployer private key has an invalid format.');
  }

  const account = privateKeyToAccount(formattedKey);

  const publicClient = createPublicClient({
    chain: celoSepolia,
    transport: http(CELO_SEPOLIA_RPC),
  });

  // Guard A: Confirm RPC chain ID.

  console.log('\nChecking connected network...');

  const actualChainId = await publicClient.getChainId();

  if (actualChainId !== CELO_SEPOLIA_CHAIN_ID) {
    throw new Error(
      `Wrong network. Expected ${CELO_SEPOLIA_CHAIN_ID}, received ${actualChainId}.`
    );
  }

  console.log('Network verification: PASSED');

  // Guard B: Confirm USDC contract exists.

  console.log('\nChecking USDC contract bytecode...');

  const tokenCode = await publicClient.getCode({
    address: CELO_SEPOLIA_USDC,
  });

  if (!tokenCode || tokenCode === '0x') {
    throw new Error(
      'No contract bytecode found at the configured USDC address. Deployment blocked.'
    );
  }

  console.log('USDC contract bytecode: FOUND');

  // Guard C: Confirm USDC decimals.

  console.log('\nChecking USDC decimals...');

  const tokenDecimals = await publicClient.readContract({
    address: CELO_SEPOLIA_USDC,
    abi: USDC_VALIDATION_ABI,
    functionName: 'decimals',
  });

  if (Number(tokenDecimals) !== EXPECTED_USDC_DECIMALS) {
    throw new Error(
      `Unexpected USDC decimals: ${tokenDecimals}. Expected ${EXPECTED_USDC_DECIMALS}.`
    );
  }

  console.log('USDC decimals verification: PASSED');

  // Guard D: Confirm deployer has native CELO.

  const balance = await publicClient.getBalance({
    address: account.address,
  });

  console.log('\n--- Deployer Wallet ---');
  console.log('Deployer Address:', account.address);
  console.log('CELO Balance:    ', formatUnits(balance, 18), 'CELO');

  if (balance === 0n) {
    throw new Error(
      'Deployer has zero CELO on Celo Sepolia. Deployment blocked.'
    );
  }

  // ==========================================================
  // STEP 7: EXPLICIT LIVE DEPLOYMENT
  // ==========================================================

  const walletClient = createWalletClient({
    account,
    chain: celoSepolia,
    transport: http(CELO_SEPOLIA_RPC),
  });

  console.log('\nAll pre-deployment checks passed.');
  console.log('Submitting deployment transaction to Celo Sepolia...');

  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: constructorArgs,
  });

  console.log('\nDeployment transaction hash:', hash);
  console.log('Waiting for transaction receipt...');

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
  });

  if (receipt.status !== 'success') {
    throw new Error(
      `Deployment transaction failed. Transaction hash: ${hash}`
    );
  }

  if (!receipt.contractAddress) {
    throw new Error(
      'Transaction succeeded but no contract address was returned.'
    );
  }

  // ==========================================================
  // STEP 8: CONFIRM DEPLOYED CONTRACT
  // ==========================================================

  const deployedCode = await publicClient.getCode({
    address: receipt.contractAddress,
  });

  if (!deployedCode || deployedCode === '0x') {
    throw new Error(
      'Deployment receipt returned an address, but no runtime bytecode was found.'
    );
  }

  console.log('\n===============================================================');
  console.log('                 DEPLOYMENT SUCCESSFUL');
  console.log('===============================================================');
  console.log('Contract Address:', receipt.contractAddress);
  console.log('Transaction Hash:', hash);
  console.log('Block Number:    ', receipt.blockNumber.toString());
  console.log('Gas Used:        ', receipt.gasUsed.toString());
  console.log(
    'CeloScan:',
    `https://sepolia.celoscan.io/address/${receipt.contractAddress}`
  );
  console.log(
    'Blockscout:',
    `https://celo-sepolia.blockscout.com/address/${receipt.contractAddress}`
  );

  console.log('\nAdd this address to your Sepolia environment configuration:');
  console.log(
    `NEXT_PUBLIC_DISBURSER_ADDRESS=${receipt.contractAddress}`
  );
  console.log('NEXT_PUBLIC_CHAIN_ID=11142220');

  console.log('\nIMPORTANT:');
  console.log('This address is for Celo Sepolia only.');
  console.log('Do not use it as a Celo Mainnet deployment address.');
  console.log('===============================================================\n');
}

// ============================================================
// ERROR HANDLING
// ============================================================

main().catch((error) => {
  console.error('\nDeployment preparation/execution error:');
  console.error(error.shortMessage || error.message || error);

  process.exitCode = 1;
});
