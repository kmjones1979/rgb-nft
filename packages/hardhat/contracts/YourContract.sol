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
 * Users can customize RGB colors for their NFTs
 * @author BuidlGuidl
 */
contract YourContract is ERC721, Ownable {
    using Strings for uint256;

    // Constants
    uint256 public constant GRID_SIZE = 16;
    uint256 public constant MAX_SUPPLY = 256; // 16 * 16
    uint256 public constant COLOR_STEP = 17; // Steps of 17 for 0-255 (15 steps: 0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255)

    // Struct to store RGB color
    struct RGBColor {
        uint8 r;
        uint8 g;
        uint8 b;
    }

    // State Variables
    uint256 public totalSupply = 0;
    mapping(uint256 => bool) public mintedTokens;
    mapping(uint256 => RGBColor) public tokenColors;
    
    // Events
    event GridBoxMinted(address indexed minter, uint256 indexed tokenId, uint256 x, uint256 y);
    event ColorUpdated(address indexed owner, uint256 indexed tokenId, uint8 r, uint8 g, uint8 b);

    // Constructor
    constructor(address _owner) ERC721("GridNFT", "GRID") Ownable(_owner) {
        console.log("GridNFT contract deployed!");
    }

    /**
     * Function to mint a specific grid box as an NFT (now free!)
     * @param tokenId The token ID to mint (1-256)
     */
    function mintGridBox(uint256 tokenId) public {
        require(tokenId >= 1 && tokenId <= MAX_SUPPLY, "Invalid token ID");
        require(!mintedTokens[tokenId], "Token already minted");

        mintedTokens[tokenId] = true;
        totalSupply++;
        
        // Calculate x, y coordinates from token ID
        uint256 x = (tokenId - 1) % GRID_SIZE;
        uint256 y = (tokenId - 1) / GRID_SIZE;

        _mint(msg.sender, tokenId);
        
        // Initialize with default color (white)
        tokenColors[tokenId] = RGBColor(255, 255, 255);
        
        emit GridBoxMinted(msg.sender, tokenId, x, y);
        
        console.log("Grid box minted: tokenId %s, coordinates (%s, %s)", tokenId, x, y);
    }

    /**
     * Function to update the color of an NFT (only by owner)
     * @param tokenId The token ID to update
     * @param r Red value (0-255)
     * @param g Green value (0-255)
     * @param b Blue value (0-255)
     */
    function updateColor(uint256 tokenId, uint8 r, uint8 g, uint8 b) public {
        require(_ownerOf(tokenId) == msg.sender, "Not the owner of this token");
        require(mintedTokens[tokenId], "Token does not exist");
        
        tokenColors[tokenId] = RGBColor(r, g, b);
        
        emit ColorUpdated(msg.sender, tokenId, r, g, b);
    }

    /**
     * Function to update color using steps (easier UX)
     * @param tokenId The token ID to update
     * @param rStep Red step (0-15, maps to 0-255)
     * @param gStep Green step (0-15, maps to 0-255)
     * @param bStep Blue step (0-15, maps to 0-255)
     */
    function updateColorBySteps(uint256 tokenId, uint8 rStep, uint8 gStep, uint8 bStep) public {
        require(_ownerOf(tokenId) == msg.sender, "Not the owner of this token");
        require(mintedTokens[tokenId], "Token does not exist");
        require(rStep <= 15 && gStep <= 15 && bStep <= 15, "Steps must be 0-15");
        
        uint8 r = rStep == 15 ? 255 : uint8(rStep * COLOR_STEP);
        uint8 g = gStep == 15 ? 255 : uint8(gStep * COLOR_STEP);
        uint8 b = bStep == 15 ? 255 : uint8(bStep * COLOR_STEP);
        
        tokenColors[tokenId] = RGBColor(r, g, b);
        
        emit ColorUpdated(msg.sender, tokenId, r, g, b);
    }

    /**
     * Function to get the color of a token
     * @param tokenId The token ID
     * @return r Red value (0-255)
     * @return g Green value (0-255)
     * @return b Blue value (0-255)
     */
    function getTokenColor(uint256 tokenId) public view returns (uint8 r, uint8 g, uint8 b) {
        require(mintedTokens[tokenId], "Token does not exist");
        RGBColor memory color = tokenColors[tokenId];
        return (color.r, color.g, color.b);
    }

    /**
     * Function to get color as a hex string
     * @param tokenId The token ID
     * @return hex color string (e.g., "#FF5733")
     */
    function getTokenColorHex(uint256 tokenId) public view returns (string memory) {
        require(mintedTokens[tokenId], "Token does not exist");
        RGBColor memory color = tokenColors[tokenId];
        
        return string(abi.encodePacked(
            "#",
            toHexString(color.r),
            toHexString(color.g),
            toHexString(color.b)
        ));
    }

    /**
     * Helper function to convert uint8 to hex string
     */
    function toHexString(uint8 value) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2);
        buffer[0] = bytes1(uint8(48 + uint256(value / 16) + (value / 16 > 9 ? 7 : 0)));
        buffer[1] = bytes1(uint8(48 + uint256(value % 16) + (value % 16 > 9 ? 7 : 0)));
        return string(buffer);
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
     * Override tokenURI to provide metadata including color
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        (uint256 x, uint256 y) = getCoordinates(tokenId);
        RGBColor memory color = tokenColors[tokenId];
        string memory colorHex = getTokenColorHex(tokenId);
        
        // Return simple JSON without base64 encoding to avoid stack overflow
        return string(abi.encodePacked(
            '{"name": "Grid Box #', tokenId.toString(),
            '", "description": "A collectible grid box NFT at coordinates (', x.toString(), ', ', y.toString(), ') with custom RGB color",',
            '"attributes": [',
            '{"trait_type": "X Coordinate", "value": ', x.toString(), '},',
            '{"trait_type": "Y Coordinate", "value": ', y.toString(), '},',
            '{"trait_type": "Color Hex", "value": "', colorHex, '"},',
            '{"trait_type": "Red", "value": ', uint256(color.r).toString(), '},',
            '{"trait_type": "Green", "value": ', uint256(color.g).toString(), '},',
            '{"trait_type": "Blue", "value": ', uint256(color.b).toString(), '}',
            ']}'
        ));
    }

    /**
     * Function that allows the contract to receive ETH
     */
    receive() external payable {}
}
