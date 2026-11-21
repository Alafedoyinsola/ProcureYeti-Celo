/**
 * Deployment & Preparation Script for ProcureYetiDisburser on Celo Sepolia
 *
 * SAFETY INVARIANT:
 * By default, this script runs in DRY-RUN / PREPARATION mode:
 * It compiles the contract with Cancun EVM settings & 200 optimizer runs,
 * generates the ABI and bytecode artifacts, encodes constructor parameters,
 * and outputs exact deployment instructions.
 *
 * No transactions are signed or broadcast unless explicitly invoked with:
 * --broadcast AND a valid DEPLOYER_PRIVATE_KEY environment variable.
 */

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const {
  parseUnits,
  encodeDeployData,
  encodeAbiParameters,
  parseAbiParameters,
  createWalletClient,
  createPublicClient,
  http,
} = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { celoSepolia } = require('viem/chains');

// 1. Network Constants
const CELO_SEPOLIA_CHAIN_ID = 11142220;
const CELO_SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_CELO_SEPOLIA_RPC ||
  'https://forno.celo-sepolia.celo-testnet.org';
const CELO_SEPOLIA_USDC = '0x01C5C0122039549AD1493B8220cABEdD739BC44E';

// 2. Production Governance Caps (6 decimals for USDC)
const MAX_SINGLE_PAYMENT = parseUnits('2500', 6); // $2,500 USDC
const DAILY_VELOCITY_CAP = parseUnits('5000', 6); // $5,000 USDC
const AUTONOMOUS_THRESHOLD = parseUnits('500', 6); // $500 USDC

async function main() {
  const isBroadcast = process.argv.includes('--broadcast');

  console.log('===============================================================');
  console.log('       ProcureYetiDisburser - Celo Sepolia Deployment          ');
  console.log('===============================================================');
  console.log('Target Network:     Celo Sepolia Testnet (Chain ID 11142220)');
  console.log('RPC Endpoint:       ', CELO_SEPOLIA_RPC);
  console.log('Verified USDC Token:', CELO_SEPOLIA_USDC);
  console.log('EVM Target:         cancun');
  console.log('Solidity Optimizer: enabled (200 runs)');
  console.log('Mode:               ', isBroadcast ? '⚡ LIVE BROADCAST REQUESTED' : '🔍 DRY-RUN PREPARATION');
  console.log('---------------------------------------------------------------\n');

  // Step 1: Read and Compile Solidity Contract
  const contractPath = path.join(__dirname, '../contracts/ProcureYetiDisburser.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: { 'ProcureYetiDisburser.sol': { content: source } },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: 'cancun',
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === 'error');
    if (errors.length > 0) {
      throw new Error('Solidity compilation failed:\n' + errors.map((e) => e.formattedMessage).join('\n'));
    }
  }

  const contract = output.contracts['ProcureYetiDisburser.sol']['ProcureYetiDisburser'];
  const abi = contract.abi;
  const bytecode = '0x' + contract.evm.bytecode.object;
  const deployedBytecode = '0x' + contract.evm.deployedBytecode.object;

  console.log('✔ Contract compiled successfully!');
  console.log('  Bytecode size:         ', bytecode.length / 2, 'bytes');
  console.log('  Deployed bytecode size:', deployedBytecode.length / 2, 'bytes');

  // Step 2: Save compiled artifact
  const artifactPath = path.join(__dirname, '../contracts/ProcureYetiDisburser.json');
  fs.writeFileSync(
    artifactPath,
    JSON.stringify(
      {
        contractName: 'ProcureYetiDisburser',
        compiler: '0.8.28',
        evmVersion: 'cancun',
        optimizer: { enabled: true, runs: 200 },
        abi,
        bytecode,
        deployedBytecode,
      },
      null,
      2
    )
  );
  console.log('✔ Compiled artifact saved to: contracts/ProcureYetiDisburser.json\n');

  // Step 3: Format Constructor Arguments
  const constructorArgs = [
    CELO_SEPOLIA_USDC,
    MAX_SINGLE_PAYMENT,
    DAILY_VELOCITY_CAP,
    AUTONOMOUS_THRESHOLD,
  ];

  const paramsDefinition = parseAbiParameters(
    'address _usdc, uint256 _maxSinglePayment, uint256 _dailyVelocityCap, uint256 _autonomousThreshold'
  );
  const encodedConstructorArgs = encodeAbiParameters(paramsDefinition, constructorArgs);

  const deployData = encodeDeployData({
    abi,
    bytecode,
    args: constructorArgs,
  });

  console.log('--- Constructor Arguments (Human & Encoded) ---');
  console.log('1. _usdc:                ', CELO_SEPOLIA_USDC, '(Native Circle USDC)');
  console.log('2. _maxSinglePayment:    ', MAX_SINGLE_PAYMENT.toString(), '($2,500 USDC)');
  console.log('3. _dailyVelocityCap:    ', DAILY_VELOCITY_CAP.toString(), '($5,000 USDC)');
  console.log('4. _autonomousThreshold: ', AUTONOMOUS_THRESHOLD.toString(), '($500 USDC)');
  console.log('\nABI-Encoded Constructor Args (for block explorer verification / cast):');
  console.log(encodedConstructorArgs);

  // Step 4: Check execution mode
  if (!isBroadcast) {
    console.log('\n===============================================================');
    console.log('                     DRY-RUN COMPLETE                          ');
    console.log('===============================================================');
    console.log('To deploy to Celo Sepolia with your owner wallet:');
    console.log('');
    console.log('Option A: Via Viem Deployer (this script):');
    console.log('  $env:DEPLOYER_PRIVATE_KEY="0x..."');
    console.log('  node scripts/deploy-disburser.js --broadcast');
    console.log('');
    console.log('Option B: Via Foundry (forge create):');
    console.log('  forge create contracts/ProcureYetiDisburser.sol:ProcureYetiDisburser \\');
    console.log('    --rpc-url https://forno.celo-sepolia.celo-testnet.org \\');
    console.log('    --private-key $DEPLOYER_PRIVATE_KEY \\');
    console.log('    --constructor-args ' + CELO_SEPOLIA_USDC + ' 2500000000 5000000000 500000000 \\');
    console.log('    --evm-version cancun --optimize --optimizer-runs 200');
    console.log('');
    console.log('Option C: Via Cast:');
    console.log('  cast send --rpc-url https://forno.celo-sepolia.celo-testnet.org \\');
    console.log('    --private-key $DEPLOYER_PRIVATE_KEY --create ' + deployData.slice(0, 50) + '... (full bytecode)');
    console.log('');
    console.log('Post-Deployment Steps:');
    console.log('  1. Add deployed address to .env.local: NEXT_PUBLIC_DISBURSER_ADDRESS=<address>');
    console.log('  2. Call disburser.approveSuppliersBatch([...], [...]) with initial vendors.');
    console.log('  3. Call disburser.setAuthorizedAgent(altanaSmartAccount, true).');
    console.log('  4. Approve & deposit treasury USDC via disburser.depositTreasury(amount).');
    console.log('===============================================================');
    return;
  }

  // Live Broadcast Execution (Guarded)
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      'Live broadcast requested (--broadcast) but DEPLOYER_PRIVATE_KEY or PRIVATE_KEY environment variable is missing.'
    );
  }

  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey);

  console.log('\n--- Deployer Wallet Details ---');
  console.log('Deployer / Owner Address:', account.address);

  const publicClient = createPublicClient({
    chain: celoSepolia,
    transport: http(CELO_SEPOLIA_RPC),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Deployer CELO Balance:   ', (Number(balance) / 1e18).toFixed(4), 'CELO');

  if (balance === 0n) {
    throw new Error(
      `Deployer ${account.address} has 0 CELO balance on Celo Sepolia. Fund via faucet at https://faucet.celo.org first.`
    );
  }

  const walletClient = createWalletClient({
    account,
    chain: celoSepolia,
    transport: http(CELO_SEPOLIA_RPC),
  });

  console.log('\nBroadcasting deployment transaction to Celo Sepolia...');
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: constructorArgs,
  });

  console.log('Deployment Transaction Hash:', hash);
  console.log('Waiting for receipt...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log('\n===============================================================');
  console.log('               DEPLOYMENT SUCCESSFUL!                          ');
  console.log('===============================================================');
  console.log('Contract Address:', receipt.contractAddress);
  console.log('Block Number:    ', receipt.blockNumber);
  console.log('Gas Used:        ', receipt.gasUsed.toString());
  console.log('CeloScan URL:    ', `https://sepolia.celoscan.io/address/${receipt.contractAddress}`);
  console.log('Blockscout URL:  ', `https://celo-sepolia.blockscout.com/address/${receipt.contractAddress}`);
  console.log('---------------------------------------------------------------');
  console.log(`Add to .env.local:\nNEXT_PUBLIC_DISBURSER_ADDRESS=${receipt.contractAddress}`);
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('\nDeployment error:', err.message || err);
  process.exit(1);
});
