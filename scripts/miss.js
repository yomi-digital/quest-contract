const { ethers, utils } = require("ethers");
const fs = require('fs');
const { generate, derive } = require('../libs/address_generator')
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

async function main() {
    const configs = JSON.parse(fs.readFileSync(process.env.CONFIG).toString())
    const ABI = JSON.parse(fs.readFileSync('./artifacts/contracts/' + configs.contract_name + '.sol/' + configs.contract_name + '.json').toString())
    const provider = new ethers.providers.JsonRpcProvider(configs.provider);
    let wallet = new ethers.Wallet.fromMnemonic(configs.owner_mnemonic, "m/44'/60'/0'/0/3").connect(provider)
    const contract = new ethers.Contract(configs.contract_address, ABI.abi, wallet)
    console.log('Using address:', wallet.address)

    // Playing same game level
    const game = await contract.levels(wallet.address)
    const quest = ["HELLO", "WORLD", "YOMI"]
    const solution = "WRONGSOLUTION"

    const price = await contract.game_prices(game)
    console.log('Voluntary missing: ' + ethers.utils.formatEther(price) + ' ETH')

    let leaves = await quest.map((x) => keccak256(x));
    let tree = await new MerkleTree(leaves, keccak256, {
        sortPairs: true,
    });
    const proof = tree.getHexProof(keccak256(solution));

    const tokensOfOwnerBefore = await contract.tokensOfOwner(wallet.address)
    console.log('You own ' + tokensOfOwnerBefore.length + ' NFTs..')
    if (tokensOfOwnerBefore.length > 0) {
        // Picking first token
        const tokenId = tokensOfOwnerBefore[0]
        // Checking level
        const level_before = await contract.levels(wallet.address)
        console.log("LEVEL BEFORE GAME IS: " + level_before.toString())
        console.log("TRYING WITH FOLLOWING PARAMETERS:", game, proof, solution, tokenId)
        // Finally solve gamve
        const result = await contract.solveGame(game, proof, solution, tokenId, { value: price })
        console.log(result)

        const level_after = await contract.levels(wallet.address)
        console.log("LEVEL AFTER GAME IS: " + level_after.toString())
        const tokensOfOwnerAfter = await contract.tokensOfOwner(wallet.address)
        console.log('TOKENS AFTER GAME ARE:', tokensOfOwnerAfter.length)
    } else {
        console.log("Can't play, don't have enough NFTs")
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
