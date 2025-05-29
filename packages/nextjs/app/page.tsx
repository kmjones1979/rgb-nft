"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [mintedTokens, setMintedTokens] = useState<Set<number>>(new Set());
  const [hoveredToken, setHoveredToken] = useState<number | null>(null);
  const [isMinting, setIsMinting] = useState<number | null>(null);

  // Read contract data
  const { data: totalSupply } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "totalSupply",
  });

  const { data: mintPrice } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "MINT_PRICE",
  });

  const { data: allMintedTokens } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getMintedTokens",
  });

  // Write contract hook
  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract({
    contractName: "YourContract",
  });

  // Update minted tokens when data changes
  useEffect(() => {
    if (allMintedTokens) {
      const tokenSet = new Set(allMintedTokens.map(token => Number(token)));
      setMintedTokens(tokenSet);
    }
  }, [allMintedTokens]);

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
        value: mintPrice || parseEther("0.01"),
      });

      notification.success(`Successfully minted grid box #${tokenId}!`);

      // Update local state immediately for better UX
      setMintedTokens(prev => new Set([...prev, tokenId]));
    } catch (error) {
      console.error("Error minting NFT:", error);
      notification.error("Failed to mint grid box");
    } finally {
      setIsMinting(null);
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

  const renderGrid = () => {
    const grid = [];
    for (let row = 0; row < 16; row++) {
      const rowBoxes = [];
      for (let col = 0; col < 16; col++) {
        const tokenId = getTokenId(row, col);
        const isMinted = mintedTokens.has(tokenId);
        const isHovered = hoveredToken === tokenId;
        const isCurrentlyMinting = isMinting === tokenId;

        rowBoxes.push(
          <div
            key={tokenId}
            className={`
              w-8 h-8 border border-gray-300 cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-bold
              ${
                isMinted
                  ? "bg-green-500 text-white"
                  : isHovered
                    ? "bg-blue-200 border-blue-400"
                    : "bg-gray-100 hover:bg-blue-100"
              }
              ${isCurrentlyMinting ? "animate-pulse bg-yellow-300" : ""}
            `}
            onClick={() => !isMinted && !isCurrentlyMinting && handleMintBox(tokenId)}
            onMouseEnter={() => setHoveredToken(tokenId)}
            onMouseLeave={() => setHoveredToken(null)}
            title={`Token ID: ${tokenId} | Coordinates: (${col}, ${row}) | ${isMinted ? "Minted" : "Available"}`}
          >
            {isMinted ? "✓" : tokenId}
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

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center">
          <span className="block text-4xl font-bold">Grid NFT Collection</span>
          <span className="block text-2xl mb-2">Collect Your Pixel</span>
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
            <div className="text-2xl font-bold">0.01 ETH</div>
            <div className="text-sm text-gray-600">Mint Price</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
          <h3 className="font-bold text-blue-800 mb-2">How to Play:</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Each box represents an NFT with a unique token ID (1-256)</li>
            <li>• Green boxes (✓) are already minted</li>
            <li>• Click any available box to mint it for 0.01 ETH</li>
            <li>• Hover over boxes to see their token ID and coordinates</li>
          </ul>
        </div>

        {/* Grid */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-6 rounded-lg shadow-lg border">
            <h2 className="text-xl font-bold text-center mb-4">16x16 Grid (256 Total Boxes)</h2>
            <div className="grid gap-1">{renderGrid()}</div>
          </div>
        </div>

        {/* Hovered Token Info */}
        {hoveredToken && (
          <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded-lg shadow-lg">
            <div className="text-sm">
              <div>Token ID: #{hoveredToken}</div>
              <div>
                Coordinates: ({getCoordinates(hoveredToken).x}, {getCoordinates(hoveredToken).y})
              </div>
              <div>Status: {mintedTokens.has(hoveredToken) ? "Minted ✓" : "Available"}</div>
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
