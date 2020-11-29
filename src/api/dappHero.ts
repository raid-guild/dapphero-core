import Arweave from 'arweave'
import Axios from 'axios'
import { readContract } from 'smartweave'
import { logger } from 'logger/customLogger'
import * as consts from 'consts'

const axios = Axios.create({ headers: { 'content-type': 'application/json' } })
const arweave = Arweave.init({
  host: 'arweave.net',// Hostname or IP address for a Arweave host
  port: 443,          // Port
  protocol: 'https',  // Network protocol http or https
  timeout: 20000,     // Network request timeouts in milliseconds
  logging: false,     // Enable network request logging
})

const PROJECTS_CONTRACT_ADDRESS = 'QYKnm-uZY9Ib6r-jwD4HXmkmyjtjWrjBiVTPgx6X1n0'
const CONTRACTS_CONTRACT_ADDRESS = 'FgnK-IPuHLyQhGS_zQUCj22E0Tom-kFEun8zxaoRme4'

const BUBBLE_ENDPOINT = false
const isProduction = process.env.NODE_ENV === 'production'
const BACKEND_URL = isProduction ? consts.global.BACKEND_PROD_URL : consts.global.BACKEND_DEV_URL

const POST = 'post'
const GET = 'get'

export const sendLogsToConsole = (json): void => {
  const { level, deviceId, isAnalytics, projectId, timestamp, message, ...restOfJson } = json
  const logItems = [ ...restOfJson ].map((item) => [ item, '/n' ]).flat(1)
  console.log(message, '\n', ...logItems)
}

export const postLogToDappHeroBackend = (payload) => {
  axios({
    method: POST,
    // url: `http://localhost:5000/log`,
    url: `https://api.dapphero.io/log`,
    data: payload,
  }).catch((e) => {
    console.log(e)
  })
}

export const postLogToBubbleBackend = (payload) => {
  axios({
    method: POST,
    url: `${BUBBLE_ENDPOINT}`,
    data: payload,
  }).catch((e) => {
    console.log(e)
  })
}

export const getContractsByProjectKeyDappHero = async (projectId) => {
  try {
    const axiosResponse = await axios({
      method: GET,
      url: `${BACKEND_URL}/projects/${projectId}/contracts/`,
    })
    const responseData = axiosResponse.data
    const { data: contracts, paused } = responseData.response
    const formattedOutput = JSON.parse(contracts).map((contract) => {
      const { contractABI, networkid, projectid, ...rest } = contract
      return {
        ...rest,
        contractAbi: JSON.parse(contractABI),
        networkId: networkid,
        projectId: projectid,
      }
    })
    return { formattedOutput, paused }
  } catch (err) {
    logger.error('Error in dappHero api, getContractsByProjectKeyV2', err)
    throw new Error(err)
  }
}

// const compareResponses = async (originalOutput, projectId) => {
//   const compareOutput = await getContractsByProjectKeyV2(projectId)
//   const isEqual = !!(JSON.stringify(originalOutput) === JSON.stringify(compareOutput))
//   // logger.info(`Cache Check isEqual: ${isEqual.toString()}`)
//   if (!isEqual) {
//     logger.info('', compareOutput)
//     logger.info('', originalOutput)
//   }
// }

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
      const { abi, name, deployedAddress, ...rest } = contract
      return {
        ...rest,
        contractAddress: deployedAddress,
        contractName: name,
        contractAbi: JSON.parse(abi),
        networkId: 4,
        projectId: projectId,
      }
    })

    // try {
    //   compareResponses(formattedOutput, projectId)
    // } catch (err) {
    //   // handle error
    // }
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
    logger.error('(DH-CORE) Error in Global Cache Network, re-trying...', error)
    try {
      return (await getContractsByProjectKeyBubble(projectId) )
    } catch (error) {
      logger.error('(DH-CORE) Failure in project cache backend', error)
    }
  }
}
