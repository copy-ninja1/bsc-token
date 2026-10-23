// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {IERC20MetadataUpgradeable} from
    "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {IERC20PermitUpgradeable} from
    "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20PermitUpgradeable.sol";

/// @notice Independent ERC-20 with permit, a recorded max supply, and disclosed pool constraints.
/// @dev This token is not Bitcoin, is not issued by Binance, and is not backed by Bitcoin.
interface ITokenV2 is IERC20MetadataUpgradeable, IERC20PermitUpgradeable {
    /// @notice Emitted alongside the standard ERC-20 Transfer event.
    /// @dev `from` and `to` are not indexed, matching the supplied reference event.
    event TransferFlapToken(address from, address to, uint256 value);

    /// @notice Emitted when the owner permanently disables pool transfer constraints.
    event TransferConstraintsRemoved(address indexed caller);

    /// @notice Initializes the proxy. The caller becomes the owner and receives `maxSupply`.
    /// @param v2Pool Predicted or deployed Uniswap V2-style pool. Must not be the zero address.
    /// @param v3Pool Predicted or deployed Uniswap V3-style pool. Must not be the zero address.
    /// @param name_ ERC-20 name stored on-chain.
    /// @param symbol_ ERC-20 symbol stored on-chain.
    /// @param meta Metadata URI stored on-chain. The URI is not the token's on-chain identity.
    /// @param maxSupply_ Initial supply, minted once to the caller. No later mint function exists.
    function initialize(
        address v2Pool,
        address v3Pool,
        string memory name_,
        string memory symbol_,
        string memory meta,
        uint256 maxSupply_
    ) external;

    /// @notice Permanently allows transfers involving the configured pool addresses.
    /// @dev Owner-only. Cannot be reversed by this contract. Does not create a market.
    function removeTransferConstraints() external;

    /// @notice On-chain metadata URI. Changing it would require a new implementation.
    function metaURI() external view returns (string memory);

    /// @notice Supply minted during initialization. This contract has no further mint function.
    function maxSupply() external view returns (uint256);

    /// @notice True while transfers to or from the configured pools revert.
    function transferConstraints() external view returns (bool);

    /// @notice Configured V2 and V3 pool addresses.
    function pools() external view returns (address v2, address v3);
}
