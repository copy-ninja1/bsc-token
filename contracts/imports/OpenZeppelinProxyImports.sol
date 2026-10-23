// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {ProxyAdmin} from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import {TransparentUpgradeableProxy} from
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/// @notice Compile-only anchor so Hardhat emits artifacts for proxy verification.
/// @dev This contract is not the token. Do not deploy it as the token.
abstract contract OpenZeppelinProxyImports {
    /// @dev References the imported types so the compiler retains their artifacts.
    function _proxyTypeNames() internal pure returns (string memory, string memory) {
        return (type(ProxyAdmin).name, type(TransparentUpgradeableProxy).name);
    }
}
