// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title YomiQuest
 * An on-chain cryptographic game for nerds, built with love at YOMI
 * https://yomi.digital
 * Core Dev: Sebastiano Cataudo aka turinglabs
 */
contract YomiQuest is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    bool public game_active = true;
    Counters.Counter private token_id_counter;
    uint256 public round_price = 0.01 ether;
    uint256 public MAX_LIVES = 20;
    mapping(uint256 => bytes32) public game_roots;
    mapping(uint256 => uint256) public game_words;
    mapping(uint256 => uint256) public solved_nfts;
    mapping(address => uint256) public lives;
    mapping(address => uint256) public birthdays;
    mapping(uint256 => address) public winners;
    mapping(uint256 => uint256) public losers;
    mapping(address => uint256) public vaults;
    string public contract_base_uri;
    address public vault_address;

    constructor(
        string memory _name,
        string memory _ticker,
        address _vault_address
    ) ERC721(_name, _ticker) {
        vault_address = _vault_address;
    }

    function _baseURI() internal view override returns (string memory) {
        return contract_base_uri;
    }

    function totalSupply() public view returns (uint256) {
        return token_id_counter.current();
    }

    function tokenURI(uint256 _tokenId)
        public
        view
        override(ERC721)
        returns (string memory)
    {
        string memory _tknId = Strings.toString(_tokenId);
        return string(abi.encodePacked(contract_base_uri, _tknId, ".json"));
    }

    function tokensOfOwner(address _owner)
        external
        view
        returns (uint256[] memory ownerTokens)
    {
        uint256 tokenCount = balanceOf(_owner);
        if (tokenCount == 0) {
            // Return an empty array
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](tokenCount);
            uint256 totalTkns = totalSupply();
            uint256 resultIndex = 0;
            uint256 tnkId;

            for (tnkId = 1; tnkId <= totalTkns; tnkId++) {
                if (ownerOf(tnkId) == _owner) {
                    result[resultIndex] = tnkId;
                    resultIndex++;
                }
            }

            return result;
        }
    }

    function fixURIs(uint8 _type, string memory _newURI) external onlyOwner {
        if (_type == 0) {
            contract_base_uri = _newURI;
        }
    }

    /*
        This method will allow owner to start and stop the game
    */
    function fixGameState(bool _newState) external onlyOwner {
        game_active = _newState;
    }

    /*
        This method will allow owner to fix the minting price
    */
    function fixPrice(uint256 _price) external onlyOwner {
        round_price = _price;
    }

    /*
        This method will allow owner to change the gnosis safe wallet
    */
    function fixVault(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Can't use black hole");
        vault_address = _newAddress;
    }

    /*
        This method will allow owner to set the merkle root
    */
    function setupGame(
        bytes32 _root,
        uint256 _game,
        uint256 _words
    ) external onlyOwner {
        game_roots[_game] = _root;
        game_words[_game] = _words;
    }

    /*
        This method will allow owner to subscribe to game
    */
    function subscribe() external {
        require(birthdays[msg.sender] == 0, "You exists yet");
        birthdays[msg.sender] = block.timestamp;
        lives[msg.sender] = MAX_LIVES;
    }

    /*
        This method will claim the free nft
    */
    function solveGame(
        uint256 _game,
        bytes32[] calldata _merkleProof,
        string memory _solution
    ) external payable nonReentrant {
        require(game_active, "Game is not active");
        require(game_words[_game] > 0, "Game doesn't exists");
        require(msg.value % round_price == 0, "Need to insert coin to play");
        require(birthdays[msg.sender] > 0, "Must born first");
        require(lives[msg.sender] > 0, "Sorry, you died");
        bytes32 leaf = keccak256(abi.encodePacked(_solution));
        bool solved = MerkleProof.verify(_merkleProof, game_roots[_game], leaf);
        if (solved) {
            // Returning funds back to user if is the first winner
            if (winners[_game] == address(0)) {
                vaults[msg.sender] += round_price;
            } else {
                // Otherwise split half of the payment with first winner
                vaults[msg.sender] += round_price / 2;
                vaults[winners[_game]] += round_price / 2;
            }
            token_id_counter.increment();
            uint256 id = token_id_counter.current();
            // Connect solved games to nft to adjust metadata
            solved_nfts[id] = _game;
            _mint(msg.sender, id);
            // Setup first winner here, it will take life time royalties
            if (winners[_game] == address(0)) {
                winners[_game] = msg.sender;
            }
        } else {
            // If solution not found, remove lives
            lives[msg.sender]--;
            losers[_game]++;
            // All funds to game vault if game is not solved
            if (winners[_game] == address(0)) {
                vaults[vault_address] += round_price;
            } else {
                // Split half of the payment with first winner
                vaults[vault_address] += round_price / 2;
                vaults[winners[_game]] += round_price / 2;
            }
        }
    }

    /*
        This method will allow owner to withdraw all ethers
    */
    function withdrawFunds() external nonReentrant {
        uint256 balance = vaults[msg.sender];
        require(balance > 0, "Nothing to withdraw");
        vaults[msg.sender] = 0;
        bool success;
        (success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdraw to vault failed");
    }
}
