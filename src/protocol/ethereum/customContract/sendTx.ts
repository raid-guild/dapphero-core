import { ethers } from 'ethers'
import { logger } from 'logger/customLogger'

export const sendTx = async ({ writeContract, provider, methodName, methodParams, value, notify }): Promise<void> => {

  const method = writeContract.functions[methodName]
  const gasPrice = await provider.getGasPrice()
  const estimateMethod = writeContract.estimate[methodName]
  let estimatedGas

  const tempOverride = { value: ethers.utils.parseEther(value) }

  try {
    estimatedGas = await estimateMethod(...methodParams, tempOverride)
  } catch (err) {
    logger.error('estimateGasMethod failed', err)
  }

  const overrides = {
    gasLimit: estimatedGas,
    gasPrice,
    value: ethers.utils.parseEther(value),
  }
  let methodResult

  try {
    methodResult = await method(...methodParams, overrides)
    // BlockNative Toaster to track tx
    notify.hash(methodResult.hash)

    // Log transaction to Database
    logger.log(methodResult)

    // Set Result on State
    return methodResult.hash
  } catch (err) {
    logger.info('invoke contract method failed in transaction', err)
  }
}
