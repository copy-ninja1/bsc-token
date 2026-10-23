import type { BaseContract, ContractRunner, ContractTransactionResponse, Interface } from "ethers";

/**
 * ABI surface used by scripts and tests.
 * Hardhat's factory is untyped unless Typechain artifacts already exist, so the
 * runtime contract is narrowed once at the deployment boundary.
 */
export interface TokenV2 {
  runner: ContractRunner | null;
  connect(runner: ContractRunner | null): TokenV2;
  deploymentTransaction(): ContractTransactionResponse | null;
  getAddress(): Promise<string>;
  interface: Interface;
  waitForDeployment(): Promise<TokenV2>;

  name(): Promise<string>;
  symbol(): Promise<string>;
  decimals(): Promise<bigint>;
  totalSupply(): Promise<bigint>;
  maxSupply(): Promise<bigint>;
  balanceOf(account: string): Promise<bigint>;
  allowance(owner: string, spender: string): Promise<bigint>;
  owner(): Promise<string>;
  metaURI(): Promise<string>;
  transferConstraints(): Promise<boolean>;
  pools(): Promise<[string, string]>;
  nonces(owner: string): Promise<bigint>;
  DOMAIN_SEPARATOR(): Promise<string>;

  transfer(to: string, amount: bigint): Promise<ContractTransactionResponse>;
  approve(spender: string, amount: bigint): Promise<ContractTransactionResponse>;
  transferFrom(from: string, to: string, amount: bigint): Promise<ContractTransactionResponse>;
  increaseAllowance(spender: string, addedValue: bigint): Promise<ContractTransactionResponse>;
  decreaseAllowance(spender: string, subtractedValue: bigint): Promise<ContractTransactionResponse>;
  permit(
    owner: string,
    spender: string,
    value: bigint,
    deadline: bigint,
    v: number,
    r: string,
    s: string,
  ): Promise<ContractTransactionResponse>;
  transferOwnership(newOwner: string): Promise<ContractTransactionResponse>;
  renounceOwnership(): Promise<ContractTransactionResponse>;
  removeTransferConstraints(): Promise<ContractTransactionResponse>;
  initialize(
    v2Pool: string,
    v3Pool: string,
    name: string,
    symbol: string,
    meta: string,
    maxSupply: bigint,
  ): Promise<ContractTransactionResponse>;
}

export function asTokenV2(contract: BaseContract): TokenV2 {
  return contract as unknown as TokenV2;
}
