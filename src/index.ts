import {extendConfig, task} from 'hardhat/config';
import {HardhatPluginError} from 'hardhat/plugins';
import {ActionType, HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig} from 'hardhat/types';
import type {DeploymentsExtension, Deployment} from 'hardhat-deploy/types';
import fs from 'fs';

import {TenderlyService} from './tenderly/TenderlyService';
import './type-extensions';
import {TenderlyContract, TenderlyContractConfig, TenderlyContractUploadRequest} from './tenderly/types';
import {basename} from 'path';

export const PluginName = 'hardhat-deploy-tenderly';

type Doc = {kind: string; methods: any; version: number};
type Source = {content: string; keccak256: string; license: string};
type Metadata = {
  compiler: {
    version: string;
  };
  language: string;
  output: {abi: any[]; devdoc: Doc; userdoc: Doc};
  settings: {
    compilationTarget: Record<string, string>;
    evmVersion: string;
    libraries: Record<string, string>;
    metadata: {
      bytecodeHash: string;
      useLiteralContent: boolean;
    };
    optimizer: {
      enabled: boolean;
      runs: number;
    };
    remappings: any[];
  };
  sources: Record<string, Source>;
  version: number;
};

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  config.tenderly = userConfig.tenderly;
});

function getDeployments(hre: HardhatRuntimeEnvironment): Promise<{[name: string]: Deployment}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deploymentExtension: DeploymentsExtension | undefined = (hre as any).deployments;
  if (!deploymentExtension) {
    throw new HardhatPluginError(PluginName, `This plugin depends on hardhat-deploy plugin`);
  }
  return deploymentExtension.all();
}

async function performAction(
  hre: HardhatRuntimeEnvironment,
  func: (request: TenderlyContractUploadRequest) => Promise<void>
) {
  const tenderlySolcConfig: TenderlyContractConfig = {};

  const chainId = (await (hre as any).getChainId()) as string;

  const deployments = await getDeployments(hre);

  // console.log({network, chainId});

  for (const deploymentName of Object.keys(deployments)) {
    if (deploymentName.endsWith('_Proxy')) {
      continue;
    }

    const deployment = deployments[deploymentName];

    let name = deploymentName;
    if (deployment.numDeployments && deployment.numDeployments > 1) {
      name = deploymentName + '_' + deployment.numDeployments.toString().padStart(3, '0');
    }

    if (deployment.metadata) {
      const metadata = JSON.parse(deployment.metadata) as Metadata;
      console.log(`processing ${deploymentName}...`);
      const compilationTargets = Object.keys(metadata.settings.compilationTarget);
      for (let i = 0; i < compilationTargets.length; i++) {
        const key = compilationTargets[i];

        const tenderlyContracts: TenderlyContract[] = [];
        // console.log(`key: ${key} ...`);
        const target = metadata.settings.compilationTarget[key];
        // const [sourcePath, contractName] = key.split(':');
        const sourcePath = key;
        // console.log(`target: ${target}, ${i === 0 ? `deployment: ${deploymentName}, ` : ''}sourcePath: ${sourcePath}`);
        tenderlyContracts.push({
          contractName: target,
          source: metadata.sources[sourcePath].content,
          sourcePath,
          compiler: {
            version: metadata.compiler.version,
          },
          networks: {
            [chainId]: {
              display_name: name,
              address: deployment.address,
              transactionHash: deployment.receipt?.transactionHash,
            },
          },
        });
        for (const sourcePath of Object.keys(metadata.sources)) {
          if (sourcePath === key) {
            continue;
          }
          let contractName = basename(sourcePath);
          if (contractName.endsWith('.sol')) {
            contractName = contractName.slice(0, contractName.length - 4);
          }
          console.log(`contractName: ${contractName}, sourcePath: ${sourcePath} ...`);
          tenderlyContracts.push({
            contractName: `${target}:${contractName}`, // works ?
            source: metadata.sources[sourcePath].content,
            sourcePath,
            compiler: {
              version: metadata.compiler.version,
            },
            // networks: {
            //   [network]: {
            //     address: deployment.address,
            //     transactionHash: deployment.receipt?.transactionHash,
            //   },
            // },
          });
        }
        tenderlySolcConfig.compiler_version = metadata.compiler.version;
        tenderlySolcConfig.optimizations_used = metadata.settings.optimizer.enabled;
        tenderlySolcConfig.optimizations_count = metadata.settings.optimizer.runs;
        tenderlySolcConfig.evm_version = metadata.settings.evmVersion;

        if (process.env.HARDHAT_DEPLOY_TENDERLY_DEBUG) {
          fs.writeFileSync(
            `.hardhat-deploy-tenderly_${target}.json`,
            JSON.stringify(
              {
                config: tenderlySolcConfig,
                contracts: tenderlyContracts,
              },
              null,
              '  '
            )
          );
        }

        await func({config: tenderlySolcConfig, contracts: tenderlyContracts});
      }
    } else {
      console.log(`skip ${deploymentName} as no metadata was found`);
    }
  }
}

const verifyContract: ActionType<void> = async (_, hre) => {
  await performAction(hre, async (request) => {
    await TenderlyService.verifyContracts(request);
  });
};

const pushContracts: ActionType<void> = async (_, hre) => {
  const project = hre.config.tenderly?.project;
  const username = hre.config.tenderly?.username;

  if (project === undefined) {
    throw new HardhatPluginError(
      PluginName,
      `Please provide the project field in the tenderly object in hardhat.config.js`
    );
  }

  const fullProjectName = project + (hre.config.tenderly?.appendNetworkNameToProject ? '-' + hre.network.name : '');

  if (username === undefined) {
    throw new HardhatPluginError(
      PluginName,
      `Please provide the username field in the tenderly object in hardhat.config.js`
    );
  }

  await performAction(hre, async (request) => {
    await TenderlyService.pushContracts(request, fullProjectName, username);
  });
};

task('tenderly:verify', 'Verifies contracts on Tenderly').setAction(verifyContract);

task('tenderly:push', 'Privately pushes contracts to Tenderly').setAction(pushContracts);
