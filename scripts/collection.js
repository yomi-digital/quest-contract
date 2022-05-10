const { ethers, utils } = require("ethers");
const fs = require('fs');
const { generate, derive } = require('../libs/address_generator')

async function main() {
    const configs = JSON.parse(fs.readFileSync(process.env.CONFIG).toString())
    const ABI = JSON.parse(fs.readFileSync('./artifacts/contracts/' + configs.contract_name + '.sol/' + configs.contract_name + '.json').toString())
    const provider = new ethers.providers.JsonRpcProvider(configs.provider);
    const owner = new ethers.Wallet(configs.owner_key).connect(provider)
    const contract = new ethers.Contract(configs.contract_address, ABI.abi, owner)
    const supply = await contract.totalSupply()
    console.log('Total supply is:', supply.toString())
    for (let i = 1; i <= parseInt(supply.toString()); i++) {
        console.log('Analyzing token id:', i)
        const ownerOf = await contract.ownerOf(i)
        console.log('Owner is:', ownerOf)
        const tokenURI = await contract.tokenURI(i)
        console.log('Token URI is:', tokenURI)
        const nft_kind = await contract.nft_kind(i)
        console.log('NFT kind is:', nft_kind.toString())
        console.log('--')
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
