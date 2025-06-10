// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev Kontrak ERC20 sederhana untuk keperluan testing
 */
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    /**
     * @dev Constructor untuk menginisialisasi token ERC20
     * @param name_ Nama token
     * @param symbol_ Simbol token
     * @param decimals_ Jumlah desimal token
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    /**
     * @dev Override fungsi decimals untuk menggunakan nilai yang dikonfigurasi
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Fungsi untuk mencetak token (hanya untuk testing)
     * @param to Alamat penerima token
     * @param amount Jumlah token yang dicetak
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}