import Arweave from 'arweave'
import Axios from 'axios'
import { readContract } from 'smartweave'
import { logger } from 'logger/customLogger'
import * as consts from 'consts'

const arweave = Arweave.init({
  host: 'arweave.net',// Hostname or IP address for a Arweave host
  port: 443,          // Port
  protocol: 'https',  // Network protocol http or https
  timeout: 20000,     // Network request timeouts in milliseconds
  logging: false,     // Enable network request logging
})

const PROJECTS_CONTRACT_ADDRESS = '7UkUpwjSn8dWMUYU-XRfeHq68uzH8lbBYjEp5BYnOXY'
const CONTRACTS_CONTRACT_ADDRESS = 'vgRwEGqrDsImkGXG9GNxBwCYR6-AVTKiet1kw-M_GdY'

export const sendLogsToConsole = (json): void => {
  const { level, deviceId, isAnalytics, projectId, timestamp, message, ...restOfJson } = json
  const logItems = [ ...restOfJson ].map((item) => [ item, '/n' ]).flat(1)
  console.log(message, '\n', ...logItems)
}

export const getContractsByProjectKeyBubble = async (projectId) => {
  logger.log(`projectId: ${projectId}`)

  try {

    const projects = await readContract(arweave, PROJECTS_CONTRACT_ADDRESS)
    const paused = projects.projects[projectId].isPaused
    const contractIds = projects.projects[projectId].contracts
    const contracts = await readContract(arweave, CONTRACTS_CONTRACT_ADDRESS)
    let contractsArray = []
    for (let i=0; i < contractIds.length; i++) {
      contractsArray.push(contracts.contracts[contractIds[i]])
    }

    const formattedOutput = contractsArray.map((contract) => {
      const { abi, name, network, deployedAddress, ...rest } = contract

      let networkId = 4
      switch(network) {
        case 'mainnet':
          networkId = 1
          break;
        case 'ropsten':
          networkId = 3
          break;
        case 'rinkeby':
          networkId = 4
          break;
        case 'goerli':
          networkId = 5
          break;
        case 'kovan':
          networkId = 42
          break;
        case 'xDai':
          networkId = 100
          break;
        case 'maticMumbaiTestnet':
          networkId = 80001
          break;
        default:
          networkId = 4
      }

      return {
        ...rest,
        contractAddress: deployedAddress,
        contractName: name,
        contractAbi: JSON.parse(abi),
        networkId: networkId,
        projectId: projectId,
      }
    })

    return { formattedOutput, paused }
  } catch (err) {
    logger.error('Error in dappHero api, getContractsByProjectKey', err)
    throw new Error(err)
  }
}

export const getContractsByProjectKey = async (projectId) => {

  // first try our cache server
  try {
    return (await getContractsByProjectKeyBubble(projectId))
  } catch (error) {
  // If the error fails, then try bubble
    logger.error('(DH-CORE) Error connecting to Arweave', error)
  }
}
