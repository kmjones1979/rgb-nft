//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

// Use openzeppelin to inherit battle-tested implementations (ERC20, ERC721, etc)
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * A smart contract that represents a 16x16 grid as NFTs
 * Each box in the grid can be minted as an individual NFT (token IDs 1-256)
 * @author BuidlGuidl
 */
contract YourContract is ERC721, Ownable {
    using Strings for uint256;

    // Constants
    uint256 public constant GRID_SIZE = 16;
    uint256 public constant MAX_SUPPLY = 256; // 16 * 16
    uint256 public constant MINT_PRICE = 0.01 ether;

    // State Variables
    uint256 public totalSupply = 0;
    mapping(uint256 => bool) public mintedTokens;
    
    // Events
    event GridBoxMinted(address indexed minter, uint256 indexed tokenId, uint256 x, uint256 y);

    // Constructor
    constructor(address _owner) ERC721("GridNFT", "GRID") Ownable(_owner) {
        console.log("GridNFT contract deployed!");
    }

    /**
     * Function to mint a specific grid box as an NFT
     * @param tokenId The token ID to mint (1-256)
     */
    function mintGridBox(uint256 tokenId) public payable {
        require(tokenId >= 1 && tokenId <= MAX_SUPPLY, "Invalid token ID");
        require(!mintedTokens[tokenId], "Token already minted");
        require(msg.value >= MINT_PRICE, "Insufficient payment");

        mintedTokens[tokenId] = true;
        totalSupply++;
        
        // Calculate x, y coordinates from token ID
        uint256 x = (tokenId - 1) % GRID_SIZE;
        uint256 y = (tokenId - 1) / GRID_SIZE;

        _mint(msg.sender, tokenId);
        
        emit GridBoxMinted(msg.sender, tokenId, x, y);
        
        console.log("Grid box minted: tokenId %s, coordinates (%s, %s)", tokenId, x, y);
    }

    /**
     * Function to get grid coordinates from token ID
     * @param tokenId The token ID
     * @return x X coordinate (0-15)
     * @return y Y coordinate (0-15)
     */
    function getCoordinates(uint256 tokenId) public pure returns (uint256 x, uint256 y) {
        require(tokenId >= 1 && tokenId <= MAX_SUPPLY, "Invalid token ID");
        x = (tokenId - 1) % GRID_SIZE;
        y = (tokenId - 1) / GRID_SIZE;
    }

    /**
     * Function to get token ID from coordinates
     * @param x X coordinate (0-15)
     * @param y Y coordinate (0-15)
     * @return tokenId The token ID (1-256)
     */
    function getTokenId(uint256 x, uint256 y) public pure returns (uint256 tokenId) {
        require(x < GRID_SIZE && y < GRID_SIZE, "Invalid coordinates");
        tokenId = y * GRID_SIZE + x + 1;
    }

    /**
     * Function to check if a token is minted
     * @param tokenId The token ID to check
     * @return Whether the token is minted
     */
    function isTokenMinted(uint256 tokenId) public view returns (bool) {
        require(tokenId >= 1 && tokenId <= MAX_SUPPLY, "Invalid token ID");
        return mintedTokens[tokenId];
    }

    /**
     * Function to get all minted tokens
     * @return An array of all minted token IDs
     */
    function getMintedTokens() public view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](totalSupply);
        uint256 counter = 0;
        
        for (uint256 i = 1; i <= MAX_SUPPLY; i++) {
            if (mintedTokens[i]) {
                result[counter] = i;
                counter++;
            }
        }
        
        return result;
    }

    /**
     * Function that allows the owner to withdraw all the Ether in the contract
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{ value: balance }("");
        require(success, "Failed to send Ether");
    }

    /**
     * Override tokenURI to provide metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        (uint256 x, uint256 y) = getCoordinates(tokenId);
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            base64encode(bytes(string(abi.encodePacked(
                '{"name": "Grid Box #', tokenId.toString(), 
                '", "description": "A collectible grid box NFT at coordinates (', x.toString(), ', ', y.toString(), ')",',
                '"attributes": [{"trait_type": "X Coordinate", "value": ', x.toString(), '},',
                '{"trait_type": "Y Coordinate", "value": ', y.toString(), '}]}'
            ))))
        ));
    }

    /**
     * Base64 encoding function
     */
    function base64encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);
        
        assembly {
            let tablePtr := add(table, 1)
            let dataPtr := data
            let endPtr := add(dataPtr, mload(data))
            let resultPtr := add(result, 32)
            
            for {} lt(dataPtr, endPtr) {}
            {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr( 6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(        input,  0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            
            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
            
            mstore(result, encodedLen)
        }
        
        return result;
    }

    /**
     * Function that allows the contract to receive ETH
     */
    receive() external payable {}
}
