// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {ITokenV2} from "./interfaces/ITokenV2.sol";
import {ERC20PermitUpgradeable} from
    "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title TokenV2
/// @notice Independent BNB Smart Chain ERC-20 deployed behind a transparent proxy.
/// @dev This is not Bitcoin, a Binance-issued asset, or a Bitcoin-backed asset.
///      The initial supply is minted once to the initializer. There is no public mint.
///      While `transferConstraints` is true, transfers to or from the configured pool
///      addresses revert, including transfers by the owner. Removing the constraints
///      does not add liquidity and does not make a market exist.
contract TokenV2 is ITokenV2, ERC20PermitUpgradeable, OwnableUpgradeable {
    /// @notice Supply minted during initialization.
    uint256 public maxSupply;

    /// @notice Metadata URI stored in contract storage. It does not define token identity.
    string public metaURI;

    /// @dev Configured V2 pool. Transfers involving this address revert while constraints are on.
    address internal uniswapV2Pool;

    /// @dev Configured V3 pool. Transfers involving this address revert while constraints are on.
    address internal uniswapV3Pool;

    /// @dev 1 while pool transfers are blocked, otherwise 0.
    ///      A full word avoids packing this flag into a neighboring address slot.
    uint256 private _transferConstraints;

    /// @dev Reserved space so later variables can be appended in an upgrade of this project.
    uint256[45] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @inheritdoc ITokenV2
    function initialize(
        address v2Pool,
        address v3Pool,
        string memory name_,
        string memory symbol_,
        string memory meta,
        uint256 maxSupply_
    ) external override initializer {
        require(v2Pool != address(0), "Token: v2 pool is the zero address");
        require(v3Pool != address(0), "Token: v3 pool is the zero address");
        require(v2Pool != msg.sender, "Token: v2 pool is the initializer");
        require(v3Pool != msg.sender, "Token: v3 pool is the initializer");
        require(v2Pool != address(this), "Token: v2 pool is the token contract");
        require(v3Pool != address(this), "Token: v3 pool is the token contract");
        require(bytes(name_).length != 0, "Token: name is empty");
        require(bytes(symbol_).length != 0, "Token: symbol is empty");
        require(bytes(meta).length != 0, "Token: metadata URI is empty");
        require(maxSupply_ != 0, "Token: max supply is zero");

        __ERC20_init(name_, symbol_);
        __ERC20Permit_init(name_);
        __Ownable_init();

        uniswapV2Pool = v2Pool;
        uniswapV3Pool = v3Pool;
        maxSupply = maxSupply_;
        metaURI = meta;
        _transferConstraints = 1;

        _mint(msg.sender, maxSupply_);
    }

    /// @inheritdoc ITokenV2
    function transferConstraints() public view override returns (bool) {
        return _transferConstraints == 1;
    }

    /// @dev Runs for transfers, mints, and burns. The owner is not exempt.
    function _beforeTokenTransfer(address from, address to, uint256) internal view override {
        if (_transferConstraints != 1) {
            return;
        }

        if (from == uniswapV2Pool || to == uniswapV2Pool) {
            revert("Token: transfer to/from uniswap v2 pool is not allowed");
        }

        if (from == uniswapV3Pool || to == uniswapV3Pool) {
            revert("Token: transfer to/from uniswap v3 pool is not allowed");
        }
    }

    /// @dev Keeps the standard ERC-20 Transfer event and adds the reference index event.
    function _afterTokenTransfer(address from, address to, uint256 amount) internal override {
        emit TransferFlapToken(from, to, amount);
    }

    /// @inheritdoc ITokenV2
    function removeTransferConstraints() external override onlyOwner {
        require(transferConstraints(), "Token: transfer constraints already removed");
        _transferConstraints = 0;
        emit TransferConstraintsRemoved(msg.sender);
    }

    /// @inheritdoc ITokenV2
    function pools() external view override returns (address v2, address v3) {
        return (uniswapV2Pool, uniswapV3Pool);
    }
}
