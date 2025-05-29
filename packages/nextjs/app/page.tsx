"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface TokenColor {
  r: number;
  g: number;
  b: number;
}

// Component to read a single token's color
const TokenColorReader = ({
  tokenId,
  onColorRead,
}: {
  tokenId: number;
  onColorRead: (tokenId: number, color: TokenColor) => void;
}) => {
  const { data: colorData } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getTokenColor",
    args: [BigInt(tokenId)],
  });

  useEffect(() => {
    if (colorData && Array.isArray(colorData) && colorData.length >= 3) {
      const color = {
        r: Number(colorData[0]),
        g: Number(colorData[1]),
        b: Number(colorData[2]),
      };
      onColorRead(tokenId, color);
    }
  }, [colorData, tokenId, onColorRead]);

  return null; // This component doesn't render anything
};

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [mintedTokens, setMintedTokens] = useState<Set<number>>(new Set());
  const [tokenColors, setTokenColors] = useState<Map<number, TokenColor>>(new Map());
  const [hoveredToken, setHoveredToken] = useState<number | null>(null);
  const [isMinting, setIsMinting] = useState<number | null>(null);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [colorSteps, setColorSteps] = useState({ r: 15, g: 15, b: 15 }); // Start with white
  const [isUpdatingColor, setIsUpdatingColor] = useState(false);

  // Read contract data
  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "totalSupply",
  });

  const { data: allMintedTokens } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getMintedTokens",
  });

  // Write contract hook
  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract({
    contractName: "YourContract",
  });

  // Callback to update token colors when read from contract
  const handleColorRead = (tokenId: number, color: TokenColor) => {
    setTokenColors(prev => new Map([...prev, [tokenId, color]]));
  };

  // Update minted tokens and set default colors
  useEffect(() => {
    if (allMintedTokens && allMintedTokens.length > 0) {
      const tokenSet = new Set(allMintedTokens.map(token => Number(token)));
      setMintedTokens(tokenSet);

      // Set default white color for newly discovered tokens
      setTokenColors(prevColors => {
        const newColors = new Map(prevColors);
        tokenSet.forEach(tokenId => {
          if (!newColors.has(tokenId)) {
            newColors.set(tokenId, { r: 255, g: 255, b: 255 });
          }
        });
        return newColors;
      });
    }
  }, [allMintedTokens]);

  const fetchSingleTokenColor = async (tokenId: number) => {
    try {
      // For now, we'll simulate the color since the read hook has issues
      // In a real implementation, you'd need to set up proper contract reading
      const currentColor = tokenColors.get(tokenId);
      if (!currentColor) {
        setTokenColors(prev => new Map([...prev, [tokenId, { r: 255, g: 255, b: 255 }]]));
      }
    } catch (error) {
      console.error(`Error fetching color for token ${tokenId}:`, error);
    }
  };

  const handleMintBox = async (tokenId: number) => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet first");
      return;
    }

    if (mintedTokens.has(tokenId)) {
      notification.error("This box is already minted!");
      return;
    }

    try {
      setIsMinting(tokenId);
      await writeYourContractAsync({
        functionName: "mintGridBox",
        args: [BigInt(tokenId)],
      });

      notification.success(`Successfully minted grid box #${tokenId} for FREE! 🎉`);

      // Update local state immediately for better UX
      setMintedTokens(prev => new Set([...prev, tokenId]));
      // Set default white color for newly minted token
      setTokenColors(prev => new Map([...prev, [tokenId, { r: 255, g: 255, b: 255 }]]));
    } catch (error) {
      console.error("Error minting NFT:", error);
      notification.error("Failed to mint grid box");
    } finally {
      setIsMinting(null);
    }
  };

  const handleUpdateColor = async () => {
    if (!selectedToken || !connectedAddress) return;

    try {
      setIsUpdatingColor(true);
      await writeYourContractAsync({
        functionName: "updateColorBySteps",
        args: [BigInt(selectedToken), colorSteps.r, colorSteps.g, colorSteps.b],
      });

      notification.success(`Color updated for token #${selectedToken}! 🎨`);

      // Update local state
      const newColor = {
        r: colorSteps.r === 15 ? 255 : colorSteps.r * 17,
        g: colorSteps.g === 15 ? 255 : colorSteps.g * 17,
        b: colorSteps.b === 15 ? 255 : colorSteps.b * 17,
      };
      setTokenColors(prev => new Map([...prev, [selectedToken, newColor]]));
    } catch (error) {
      console.error("Error updating color:", error);
      notification.error("Failed to update color");
    } finally {
      setIsUpdatingColor(false);
    }
  };

  const getTokenId = (row: number, col: number): number => {
    return row * 16 + col + 1;
  };

  const getCoordinates = (tokenId: number): { x: number; y: number } => {
    const x = (tokenId - 1) % 16;
    const y = Math.floor((tokenId - 1) / 16);
    return { x, y };
  };

  const getRgbString = (color: TokenColor): string => {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  };

  const isOwnedByUser = (tokenId: number): boolean => {
    // In a real app, you'd check ownership from the contract
    // For now, assume all minted tokens are owned by current user if connected
    return mintedTokens.has(tokenId) && !!connectedAddress;
  };

  const renderGrid = () => {
    const grid = [];
    for (let row = 0; row < 16; row++) {
      const rowBoxes = [];
      for (let col = 0; col < 16; col++) {
        const tokenId = getTokenId(row, col);
        const isMinted = mintedTokens.has(tokenId);
        const isHovered = hoveredToken === tokenId;
        const isCurrentlyMinting = isMinting === tokenId;
        const isSelected = selectedToken === tokenId;
        const tokenColor = tokenColors.get(tokenId);
        const isOwned = isOwnedByUser(tokenId);

        let backgroundColor = "bg-gray-100";
        let textColor = "text-gray-800";

        if (isMinted && tokenColor) {
          backgroundColor = getRgbString(tokenColor);
          // Determine text color based on brightness
          const brightness = (tokenColor.r * 299 + tokenColor.g * 587 + tokenColor.b * 114) / 1000;
          textColor = brightness > 128 ? "text-black" : "text-white";
        } else if (isMinted) {
          backgroundColor = "bg-white";
        } else if (isHovered) {
          backgroundColor = "bg-blue-200 border-blue-400";
        }

        rowBoxes.push(
          <div
            key={tokenId}
            className={`
              w-8 h-8 border-2 cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-bold
              ${isSelected ? "border-yellow-500 border-4" : "border-gray-300"}
              ${isCurrentlyMinting ? "animate-pulse bg-yellow-300" : ""}
              ${!isMinted ? "hover:bg-blue-100" : ""}
              ${textColor}
            `}
            style={{ backgroundColor: isMinted && tokenColor ? getRgbString(tokenColor) : undefined }}
            onClick={() => {
              if (!isMinted && !isCurrentlyMinting) {
                handleMintBox(tokenId);
              } else if (isMinted && isOwned) {
                setSelectedToken(tokenId);
                // Set current color steps based on token color
                if (tokenColor) {
                  setColorSteps({
                    r: Math.round(tokenColor.r / 17),
                    g: Math.round(tokenColor.g / 17),
                    b: Math.round(tokenColor.b / 17),
                  });
                }
              }
            }}
            onMouseEnter={() => setHoveredToken(tokenId)}
            onMouseLeave={() => setHoveredToken(null)}
            title={`Token ID: ${tokenId} | Coordinates: (${col}, ${row}) | ${isMinted ? (isOwned ? "Owned - Click to customize" : "Minted") : "Available - Click to mint FREE"}`}
          >
            {isMinted ? (
              tokenColor && (tokenColor.r !== 255 || tokenColor.g !== 255 || tokenColor.b !== 255) ? (
                <div className="flex flex-col items-center leading-none">
                  <div className="text-[6px]">{tokenColor.r}</div>
                  <div className="text-[6px]">{tokenColor.g}</div>
                  <div className="text-[6px]">{tokenColor.b}</div>
                </div>
              ) : (
                "✓"
              )
            ) : (
              tokenId
            )}
          </div>,
        );
      }
      grid.push(
        <div key={row} className="flex">
          {rowBoxes}
        </div>,
      );
    }
    return grid;
  };

  const renderColorPicker = () => {
    if (!selectedToken) return null;

    const previewColor = {
      r: colorSteps.r === 15 ? 255 : colorSteps.r * 17,
      g: colorSteps.g === 15 ? 255 : colorSteps.g * 17,
      b: colorSteps.b === 15 ? 255 : colorSteps.b * 17,
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border mt-6 max-w-md mx-auto">
        <h3 className="text-xl font-bold text-center mb-4">Customize Token #{selectedToken}</h3>

        {/* Color Preview */}
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: getRgbString(previewColor) }}
          >
            ✓
          </div>
        </div>

        {/* RGB Sliders */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Red: {previewColor.r}</label>
            <input
              type="range"
              min="0"
              max="15"
              value={colorSteps.r}
              onChange={e => setColorSteps(prev => ({ ...prev, r: parseInt(e.target.value) }))}
              className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Green: {previewColor.g}</label>
            <input
              type="range"
              min="0"
              max="15"
              value={colorSteps.g}
              onChange={e => setColorSteps(prev => ({ ...prev, g: parseInt(e.target.value) }))}
              className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Blue: {previewColor.b}</label>
            <input
              type="range"
              min="0"
              max="15"
              value={colorSteps.b}
              onChange={e => setColorSteps(prev => ({ ...prev, b: parseInt(e.target.value) }))}
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleUpdateColor}
            disabled={isUpdatingColor}
            className={`flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${
              isUpdatingColor ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
            } text-white`}
          >
            {isUpdatingColor ? "Updating..." : "Update Color"}
          </button>

          <button
            onClick={() => setSelectedToken(null)}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-bold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      {/* Color readers for minted tokens */}
      {Array.from(mintedTokens).map(tokenId => (
        <TokenColorReader key={tokenId} tokenId={tokenId} onColorRead={handleColorRead} />
      ))}

      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-4xl font-bold">Colorful Grid NFT Collection</span>
          <span className="block text-2xl mb-2">Mint Free & Customize Colors</span>
        </h1>
        <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
          <p className="my-2 font-medium">Connected Address:</p>
          <Address address={connectedAddress} />
        </div>

        {/* Stats */}
        <div className="flex justify-center space-x-8 my-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{Number(totalSupply || 0)}</div>
            <div className="text-sm text-gray-600">Minted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{256 - Number(totalSupply || 0)}</div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">FREE</div>
            <div className="text-sm text-gray-600">Mint Price</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
          <h3 className="font-bold text-blue-800 mb-2">How to Play:</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Each box represents an NFT with a unique token ID (1-256)</li>
            <li>• Click any gray box to mint it for FREE! 🆓</li>
            <li>• Click your owned colored boxes to customize their RGB colors</li>
            <li>• Use the sliders to adjust Red, Green, and Blue values (16 steps each)</li>
            <li>• Yellow border shows selected token for customization</li>
          </ul>
        </div>

        {/* Grid */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-6 rounded-lg shadow-lg border">
            <h2 className="text-xl font-bold text-center mb-4">16x16 Colorful Grid (256 Total Boxes)</h2>
            <div className="grid gap-1">{renderGrid()}</div>
          </div>
        </div>

        {/* Color Picker */}
        {renderColorPicker()}

        {/* Hovered Token Info */}
        {hoveredToken && (
          <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded-lg shadow-lg">
            <div className="text-sm">
              <div>Token ID: #{hoveredToken}</div>
              <div>
                Coordinates: ({getCoordinates(hoveredToken).x}, {getCoordinates(hoveredToken).y})
              </div>
              <div>Status: {mintedTokens.has(hoveredToken) ? "Minted ✓" : "Available"}</div>
              {mintedTokens.has(hoveredToken) && tokenColors.get(hoveredToken) && (
                <div>
                  Color: RGB({tokenColors.get(hoveredToken)?.r}, {tokenColors.get(hoveredToken)?.g},{" "}
                  {tokenColors.get(hoveredToken)?.b})
                </div>
              )}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <BugAntIcon className="h-8 w-8 fill-secondary" />
              <p>
                Tinker with your smart contract using the{" "}
                <Link href="/debug" passHref className="link">
                  Debug Contracts
                </Link>{" "}
                tab.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MagnifyingGlassIcon className="h-8 w-8 fill-secondary" />
              <p>
                Explore your local transactions with the{" "}
                <Link href="/blockexplorer" passHref className="link">
                  Block Explorer
                </Link>{" "}
                tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
