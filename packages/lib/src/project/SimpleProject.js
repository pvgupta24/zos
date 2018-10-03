import _ from 'lodash';
import { buildCallData, callDescription } from '../utils/ABIs';
import { deploy, sendDataTransaction } from "../utils/Transactions";
import Proxy from '../proxy/Proxy';
import Logger from '../utils/Logger';
import { toAddress } from '../utils/Addresses';
import { bytecodeDigest } from '..';
import { Package } from '../../lib';

const log = new Logger('SimpleProject')

export default class SimpleProject  {
  constructor(name = 'main', txParams = {}) {
    this.txParams = txParams
    this.name = name
    this.implementations = {}
    this.dependencies = {}
  }

  async createProxy(contractClass, { packageName, contractName, initMethod: initMethodName, initArgs, redeployIfChanged } = {}) {
    if (!_.isEmpty(initArgs) && !initMethodName) initMethodName = 'initialize'
    const implementationAddress = await this._getOrDeployImplementation(contractClass, contractName, redeployIfChanged);
    const initCallData = this._getAndLogInitCallData(contractClass, initMethodName, initArgs, implementationAddress, 'Creating')
    const proxy = await Proxy.deploy(implementationAddress, initCallData, this.txParams)
    log.info(`Instance created at ${proxy.address}`)
    return new contractClass(proxy.address);
  }

  async upgradeProxy(proxyAddress, contractClass, { packageName, contractName, initMethod: initMethodName, initArgs, redeployIfChanged } = {}) {
    proxyAddress = toAddress(proxyAddress)
    const implementationAddress = await this._getOrDeployImplementation(contractClass, contractName, redeployIfChanged);    
    const initCallData = this._getAndLogInitCallData(contractClass, initMethodName, initArgs, implementationAddress, 'Upgrading')
    const proxy = Proxy.at(proxyAddress, this.txParams)
    await proxy.upgradeTo(implementationAddress, initCallData)
    log.info(`Instance at ${proxyAddress} upgraded`)
    return new contractClass(proxyAddress);
  }

  async changeProxyAdmin(proxyAddress, newAdmin) {
    const proxy = Proxy.at(proxyAddress, this.txParams)
    await proxy.changeAdmin(newAdmin)
    log.info(`Proxy admin changed to ${newAdmin}`)
    return proxy
  }

  async setImplementation(contractClass, contractName) {
    log.info(`Deploying logic contract for ${contractClass.contractName}`);
    if (!contractName) contractName = contractClass.contractName;
    const implementation = await deploy(contractClass, [], this.txParams);
    this.registerImplementation(contractName, {
      address: implementation.address,
      bytecodeHash: bytecodeDigest(contractClass.bytecode)
    })
    return implementation;
  }

  async unsetImplementation(contractName) {
    delete this.implementations[contractName]
  }

  registerImplementation(contractName, { address, bytecodeHash }) {
    this.implementations[contractName] = { address, bytecodeHash }
  }

  async getImplementation({ packageName, contractName }) {
    return (!packageName || packageName === this.name)
      ? (this.implementations[contractName] && this.implementations[contractName].address)
      : this._getDependencyImplementation(packageName, contractName);
  }

  async getDependencyPackage(name) {
    return Package.at(this.dependencies[name].package)
  }

  async getDependencyVersion(name) {
    return this.dependencies[name].version
  }

  async hasDependency(name) {
    return !!this.dependencies[name]
  }

  async setDependency(name, packageAddress, version) {
    this.dependencies[name] = { package: packageAddress, version }
  }

  async unsetDependency(name) {
    delete this.dependencies[name]
  }

  async _getOrDeployImplementation(contractClass, packageName, contractName, redeployIfChanged) {
    if (!contractName) contractName = contractClass.contractName;
    
    return (!packageName || packageName === this.name)
      ? this._getOrDeployOwnImplementation(contractClass, contractName, redeployIfChanged)
      : this._getDependencyImplementation(packageName, contractName)
  }

  async _getOrDeployOwnImplementation(contractClass, contractName, redeployIfChanged) {
    const existing = this.implementations[contractName];
    const contractChanged = existing && existing.bytecodeHash !== bytecodeDigest(contractClass.bytecode)
    const shouldRedeploy = !existing || (redeployIfChanged && contractChanged)
    
    return shouldRedeploy
      ? existing.address
      : this.setImplementation(contractClass, contractName).address;
  }

  async _getDependencyImplementation(packageName, contractName) {
    const { package: thepackage, version } = this.dependencies[packageName];
    return thepackage.getImplementation(version, contractName)
  }

  _getAndLogInitCallData(contractClass, initMethodName, initArgs, implementationAddress, actionLabel) {
    if (initMethodName) {
      const { method: initMethod, callData } = buildCallData(contractClass, initMethodName, initArgs);
      log.info(`${actionLabel} proxy to logic contract ${implementationAddress} and initializing by calling ${callDescription(initMethod, initArgs)}`)
      return callData;
    } else {
      log.info(`${actionLabel} proxy to logic contract ${implementationAddress}`)  
      return null;
    }
  }
}