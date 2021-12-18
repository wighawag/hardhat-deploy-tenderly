[![hardhat](https://hardhat.org/hardhat-plugin-badge.svg?1)](https://hardhat.org)
# hardhat-deploy-tenderly

_A plugin to push contracts to tenderly_

## What

This plugin add 2 commands to hardhat

- `hardhat --network <networkName> tenderly:push`
- `hardhat --network <networkName> tenderly:verify`

## Installation

```bash
npm install -D hardhat-deploy-tenderly
```

And add the following statement to your `hardhat.config.ts`:

```ts
import "hardhat-deploy-tenderly";
```

## Required plugins

`hardhat-deploy`

## Tasks

### tenderly:push

This plugin adds the _tenderly:push_ task to Hardhat:

```sh
hardhat --network <networkName> tenderly:push
``` 

This will push all your contract currently deployed on that network to tenderly.

You ll have access to all debugging facility of Tenderly but your contract code will remains private to you and tenderly

### tenderly:verify

This plugin adds the _tenderly:verify_ task to Hardhat:

```sh
hardhat --network <networkName> tenderly:verify
``` 


This will push all your contract currently deployed on that network to tenderly and verify them publicly.

## Configuration


This plugin extends the `HardhatConfig`'s `ProjectPaths` object with an optional 
`tenderly` field.

This is an example of how to set it:

```js
module.exports = {
  tenderly: {
    project: '<tenderly project name>',
    username: '<tenderly username>',
  }
};
```

## Usage

Make sure you configure your tenderly settings above.


Install it and you can execute 

- `hardhat --network <networkName> tenderly:push`
- `hardhat --network <networkName> tenderly:verify`
