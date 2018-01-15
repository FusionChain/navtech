# SOFTNODE

## Client Settings

| Specification | Value |
|:-----------|:-----------|
| addanonserver | `95.183.52.55:3000` |
| addanonserver | `95.183.53.184:3000` |
| addanonserver | `95.183.52.28:3000` |
| addanonserver | `95.183.52.29:3000` |
| anonhash | `000c17f28eaa71f48de6d8856fc3a22f` |

## RECOMMENDED SPECIFICATIONS

- To start up a SOFTNode cluster, you will need a minimum of 2 servers with the following specifications each with their own IP Adddress and have the correct ports open for the API.

| Component | Value |
|:-----|:-----|
| CPU | 2 x 2.4 Ghz Intel Xeon |
| RAM | 2 GB |
| Hard Disk | 40GB |
| Operating System | 64bit Debian or Ubuntu |
| API Port | 3000 |

## SETUP STEPS

### SETUP SOFTCOIN AND SUBCHAIN

- Download and compile both the softcoind & subchaind daemons. These each have their own setup steps and you will need to refer to their individual readme files.

https://github.com/softcoindev/softcoin2/tree/master

https://github.com/softcoindev/subchain/tree/master

- Stop softcoind and softajoanonsubchaind if they are running
```
./softcoind stop
./softajoanonsubchaind stop
```

- Configure your softcoin conf file to have valid rpc credentials. Passwords should be a-z, A-Z and 0-9. The use of some symbols causes the RPC connection to fail so it is recommended to avoid them all together.
``` sh
vi ~/.softcoin2/softcoin.conf
```
```
rpcuser=<SOFTCOIN_RPC_USERNAME>
rpcpassword=<SOFTCOIN_RPC_PASSWORD>
```
- Configure your softajoanonsubchain conf file to have valid rpc credentials. Passwords should be a-z, A-Z and 0-9. The use of some symbols causes the RPC connection to fail so it is recommended to avoid them all together.
``` sh
vi ~/.softajoanonsubchain/softajoanonsubchain.conf
```
```
rpcuser=<SUBCHAIN_RPC_USERNAME>
rpcpassword=<SUBCHAIN_RPC_PASSWORD>
```
- Start softcoind and softajoanonsubchaind back up again with the new rpc details
```
./softcoind
./softajoanonsubchaind
```

- Make sure that both Soft Coin and the Subchain are fully synced before attempting the setup steps.

### INSTALL TOOLS AND DOWNLOAD SOURCE
- If you don't have git or npm installed, please install them.
``` sh
sudo apt-get update
sudo apt-get install git npm
```
- Install nodejs v 6.3.1 using the following commands
``` sh
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```
The node -v command should show v6.3.1 if this doesnt work, please consult the nodejs website on how to install this version.

- Clone the crypto-anonymizer ropo into the folder you want to run the code from with the command
``` sh
git clone https://github.com/softcoindev/softnode.git
```
### SETUP INCOMING SERVER
- On the incoming server open the config folder and copy the incoming settings example to what will be your local settings file and open it
``` sh
cd softnode/config
cp example-incoming.default.json default.json
vi default.json
```
- This file determines all the settings necessary to operate your incoming SOFTNode Server. You will need to configure this to your own settings.

Here are the detailed explaination of what the settings control and their defaults:

| Name | Type | Required | Default | Description |
|:-----|:-----|:-----|:-----|:-----|
| `GLOBAL` | `object`      | true    | `none` | contains the global settings which control how your server operates |
| `GLOBAL.serverType` | `string`      | true    | `INCOMING` | determines if your server is of incoming or outgoing type |
| `GLOBAL.encryptedWallet` | `boolean`      | true    | `false` | flag for if the SoftCoin and Subchain wallets are encrypted  |
| `GLOBAL.preventSend` | `boolean`      | false    | `false` | flag to prevent sending of SOFT & SUB for testing purposes  |
| `GLOBAL.maintenance` | `boolean`      | false    | `false` | flag to turn your wallet to maintenance mode and restrict IP access  |
| `GLOBAL.allowedIps` | `array`      | false    | `none` | array of allowed ip addresses when server is in maintenance mode  |
| `GLOBAL.allowedIps[n]`       | `object`      | true    | `none` | contains the address information of a single user allowed while in maintenance |
| `GLOBAL.allowedIps[n].ipAddress` |  `string` | true | `none` | ip address to allow for maintenance testing |
| `INCOMING` | `object`      | true    | `none` | contains all the settings which are unique to incoming servers |
| `INCOMING.local`       | `object`      | true    | `none` | contains the address information of the local (incoming) server |
| `INCOMING.local.ipAddress` |  `string` | true | `none` | IP address of the local server |
| `INCOMING.local.port` |  `string` | true | 3000 | port of the local server |
| `INCOMING.local.host` |  `string` | false | `none` | optional dns name of the local server |
| `INCOMING.remote`       | `array`      | true    | `none` | contains the settings object of each (outgoing) server in the cluster |
| `INCOMING.remote[n]`       | `object`      | true    | `none` | contains the address information of a single remote (outgoing) server in the cluster |
| `INCOMING.remote[n].ipAddress` |  `string` | true | `none` | IP address of the remote server |
| `INCOMING.remote[n].port` |  `string` | true | 3000 | port of the remote server |
| `INCOMING.remote[n].host` |  `string` | false | `none` | optional dns name of the remote server |
| `INCOMING.scriptInterval` |  `int` | true | 120000 | time in milliseconds between each transaction processing cycle |
| `INCOMING.minAmount` |  `int` | true | 10 | minimum transaction size the server will accept |
| `INCOMING.maxAmount` |  `int` | true | 10000 | maximum transaction size the server will accept |
| `INCOMING.anonFeePercent` |  `float` | true | 0.5 | percentage taken as the server transaction fee, must be between 0 - 100. |
| `INCOMING.notificationEmail` |  `string` | true | `none` | email address error notifications will be sent to |
| `INCOMING.smtp`       | `object`      | true    | `none` | contains the settings to send notification emails via smtp |
| `INCOMING.smtp.user`       | `string`      | true    | `none` | username for sending mail via smtp |
| `INCOMING.smtp.pass`       | `string`      | true    | `none` | password for sending mail via smtp |
| `INCOMING.smtp.server`       | `string`      | true    | `none` | server for sending mail via smtp |
| `INCOMING.softCoin`       | `object`      | true    | `none` | contains the settings for the softcoin daemon |
| `INCOMING.softCoin.user`       | `string`      | true    | `none` | rpcusername set in the softcoin.conf file |
| `INCOMING.softCoin.pass`       | `string`      | true    | `none` | rpcpassword set in the softcoin.conf file |
| `INCOMING.softCoin.ip`       | `string`      | true    | '127.0.0.1' | ip address where softcoind is running |
| `INCOMING.softCoin.port`       | `string`      | true    | '44444' | port softcoind is running on |
| `INCOMING.softCoin.walletPassphrase`       | `string`      | `encryptedWallet`    | `none` | walletpassphrase to use to unlock the wallet for transactions. If the wallet is unencrypted, this will be used to encrypt it during setup |
| `INCOMING.subChain`       | `object`      | true    | `none` | contains the settings for the subchain daemon |
| `INCOMING.subChain.user`       | `string`      | true    | `none` | rpcusername set in the softajoanonsubchain.conf file |
| `INCOMING.subChain.pass`       | `string`      | true    | `none` | rpcpassword set in the softajoanonsubchain.conf file |
| `INCOMING.subChain.ip`       | `string`      | true    | '127.0.0.1' | ip address where softajoanonsubchain is running |
| `INCOMING.subChain.port`       | `string`      | true    | '44444' | port softajoanonsubchaind is running on |
| `INCOMING.subChain.walletPassphrase`       | `string`      | `encryptedWallet`   | `none` | walletpassphrase to use to unlock the wallet for transactions. If the wallet is unencrypted, this will be used to encrypt it during setup |
| `INCOMING.secretOptions`       | `object`      | true    | `none` | contains the options for creating the shared secret |
| `INCOMING.secretOptions.salt`       | `string`      | true    | `none` | any string to create randomness in the secret, recommended 20 characters |
| `INCOMING.secretOptions.saltRounds`       | `int`      | true    | 10 | number of times to salt the sercret |
| `INCOMING.secret`       | `string`      | true    | `none` | this is the secret shared between the incoming and outgoing server pair. This will be generated during the setup process  |
| `OUTGOING` | `boolean`      | true    | `false` | explicit flag to confirm that this is not an outgoing server |

- Please note that it is not recommended to run using an encrypted Soft Coin or Subchain wallet. During testing this cause some errors to be thrown when processing high volume transactions.

## RUNNING THE INCOMING SETUP SCRIPTS

Now the configuration is done, we need to perform the setup operations from the project root directory.

- First thing is to clean and install the npm modules, so change directory to the root of he project and run these commands:
``` sh
rm -rf node_modules
npm cache clean
npm install
```
- Make the folders for the generated RSA keys to be stored in
``` sh
mkdir keys keys/private keys/public
```
- Then run the setup command
``` sh
npm run setup
```
  * If your softcoin wallet was unencrypted and you've set the global encryptedWallet flag to `true` it will encrypt the wallet with the walletpassphrase you set in the incoming settings file and ask you to restart softcoind. Then run the setup again
``` sh
npm run setup
```
  * If your subchain wallet was unencrypted and you've set the global encryptedWallet flag to `true` it will encrypt the wallet with the walletpassphrase you set in the incoming settings file and ask you to restart softajoanonsubchaind. Then run the setup again
``` sh
npm run setup
```
- If your softcoin and subchain were already encrypted or they were encrypted using the steps above, your wallet will now begin to generate a pool of Soft Coin and Subchain addresses to use for transactions. You should see status messages appear with wallet addresses. Wait for this process to complete.

- After generating the addresses, it should also output the generated secret and let you know that the operation was successful. Please copy the secret, re-open the incoming settings file and paste it as the value for the property `secret` eg.
``` sh
vi config/default.js
```
``` js
...
secret: '$2a$10$u17OImuiUFGuhkvkeEV/3.5Npk3djKdxce0',
...
```
- You have the option of running the compiled version of SOFTNode which we release or building your own. If you are happy to run what we have distributed then skip this step otherwise, run the following command to build your version:
``` sh
npm run build
```

- This should generate 2 files in the /dist directory: softnode.js and vendor.js

- The vendor file links to all the included libraries while the softnode file is the compressed and uglified version of the softnode anon processing scripts.

- We recommend using a service called forever js to manage the softnode server for you. It will restart the application if it were to crash and also consolidate and version any error logs which are produced.
``` sh
npm install -g forever
```
- Start the incoming server and check there were no problems
``` sh
forever start dist/softnode.js
```

- This should send a test email to your selected notification email address to make sure that is working. Then check the logs.
``` sh
forever logs 0
```
- The logs which are displayed should simply let you know the server has started. If this is the first server you have setup it will also report it was unable to contact an outgoing server. You can test the server is running by opening your browser and softigating to your server's IP address and port eg. https://95.183.53.184:3000

- We use generated unsigned SSL certificates, so proceed past the invalid SSL certificate and you should see a response like:
```
{"status":200,"type":"SUCCESS","message":"server is running!", "anonhash": "e0396962abef360221920beec1c08c18"}
```

- If you see this message, your incoming server is ready to accept transactions. The anonhash parameter is what you need to enter into your softcoin.conf file before trying to send anon transactions to this server. This hash will change as new versions of the software are released, so it will not be exactly what is listed in here. This is what the server sends to your wallet to confirm validty of the code it is running.
```
anonhash=e0396962abef360221920beec1c08c18
```

- Now we need to send the incoming server subchain coins to send to the outgoing server. First, get an account address
```
./softajoanonsubchaind getaccountaddress incomingAccount
```

- And send subchain coins to the echoed address split into 1000 SUB transactions. The reason why we split it up is because a wallet can only spend (and receive change from) a transaction once per block. So if we had all our SUB in 1 transaction to start with the server would have trouble processing more than 1 transaction at a time.
```
./softajoanonsubchaind sendtoaddress SgYPEy3RndRgdPVAWT7FiAkFEyjekLgaeb 1000
```

### SETUP OUTGOING SERVER

Setting up the outgoing server is much the same process as the incoming server but with some different settings.

- Repeat the steps under headings: `SETUP SOFTCOIN AND SUBCHAIN` and `INSTALL TOOLS AND DOWNLOAD SOURCE`

- On the outgoing server open the config folder and copy the outgoing settings example to what will be your local settings file and open it
``` sh
cd softnode/config
cp example-outgoing.default.json default.json
vi default.json
```
- This file determines all the settings necessary to operate your outgoing SOFTNode Server. You will need to configure this to your own settings.

Here are the detailed explaination of what the settings control and their defaults:

| Name | Type | Required | Default | Description |
|:-----|:-----|:-----|:-----|:-----|
| `GLOBAL` | `object`      | true    | `none` | contains the global settings which control how your server operates |
| `GLOBAL.serverType` | `string`      | true    | `INCOMING` | determines if your server is of incoming or outgoing type |
| `GLOBAL.encryptedWallet` | `boolean`      | true    | `false` | flag for if the SoftCoin and Subchain wallets are encrypted  |
| `OUTGOING.local`       | `object`      | true    | `none` | contains the address information of the local (outgoing) server |
| `OUTGOING.local.ipAddress` |  `string` | true | `none` | IP address of the local server |
| `OUTGOING.local.port` |  `string` | true | 3000 | port of the local server |
| `OUTGOING.local.host` |  `string` | false | `none` | optional dns name of the local server |
| `OUTGOING.remote`       | `array`      | true    | `none` | contains the settings object of each (incoming) server in the cluster |
| `OUTGOING.remote[n]`       | `object`      | true    | `none` | contains the address information of a single remote (incoming) server in the cluster |
| `OUTGOING.remote[n].ipAddress` |  `string` | true | `none` | IP address of the remote server |
| `OUTGOING.remote[n].port` |  `string` | true | 3000 | port of the remote server |
| `OUTGOING.remote[n].host` |  `string` | false | `none` | optional dns name of the remote server |
| `OUTGOING.scriptInterval` |  `int` | true | 120000 | time in milliseconds between each transaction processing cycle |
| `OUTGOING.minAmount` |  `int` | true | 10 | minimum transaction size the server will accept |
| `OUTGOING.maxAmount` |  `int` | true | 10000 | maximum transaction size the server will accept |
| `OUTGOING.softPoolAmount` |  `int` | true | 50000 | the size of the SOFT pool, all funds exceeding this value get sent to the SOFTNode fee address |
| `OUTGOING.txFeePayoutMin` |  `int` | true | 100 | the minimum fee amount to accrue before sending a payout to the anonTxFeeAddress |
| `OUTGOING.anonTxFeeAddress` |  `string` | true | `none` | SOFT address used to collect the server processing fee. |
| `OUTGOING.notificationEmail` |  `string` | true | `none` | email address error notifications will be sent to |
| `OUTGOING.smtp`       | `object`      | true    | `none` | contains the settings to send notification emails via smtp |
| `OUTGOING.smtp.user`       | `string`      | true    | `none` | username for sending mail via smtp |
| `OUTGOING.smtp.pass`       | `string`      | true    | `none` | password for sending mail via smtp |
| `OUTGOING.smtp.server`       | `string`      | true    | `none` | server for sending mail via smtp |
| `OUTGOING.softCoin`       | `object`      | true    | `none` | contains the settings for the softcoin daemon |
| `OUTGOING.softCoin.user`       | `string`      | true    | `none` | rpcusername set in the softcoin.conf file |
| `OUTGOING.softCoin.pass`       | `string`      | true    | `none` | rpcpassword set in the softcoin.conf file |
| `OUTGOING.softCoin.ip`       | `string`      | true    | '127.0.0.1' | ip address where softcoind is running |
| `OUTGOING.softCoin.port`       | `string`      | true    | '44444' | port softcoind is running on |
| `OUTGOING.softCoin.walletPassphrase`       | `string`      | `encryptedWallet`    | `none` | walletpassphrase to use to unlock the wallet for transactions. If the wallet is unencrypted, this will be used to encrypt it during setup |
| `OUTGOING.subChain`       | `object`      | true    | `none` | contains the settings for the subchain daemon |
| `OUTGOING.subChain.user`       | `string`      | true    | `none` | rpcusername set in the softajoanonsubchain.conf file |
| `OUTGOING.subChain.pass`       | `string`      | true    | `none` | rpcpassword set in the softajoanonsubchain.conf file |
| `OUTGOING.subChain.ip`       | `string`      | true    | '127.0.0.1' | ip address where softajoanonsubchain is running |
| `OUTGOING.subChain.port`       | `string`      | true    | '44444' | port softajoanonsubchaind is running on |
| `OUTGOING.subChain.walletPassphrase`       | `string`      | `encryptedWallet`    | `none` | walletpassphrase to use to unlock the wallet for transactions. If the wallet is unencrypted, this will be used to encrypt it during setup |
| `OUTGOING.secret`       | `string`      | true    | `none` | this is the secret shared between the incoming and outgoing server pair. This needs to match the sercret used in the incoming server settings that was generated by running 'npm run setup' on the incoming server  |
| `INCOMING` | `boolean`      | true    | `false` | explicit flag to confirm that this is not an incoming server |

This is very similar to the incoming serer, however please note that in this instance the local server refers to the outgoing server since this is the server we are configuring and the remotes are the incoming servers in your cluster. The secret will not be generated by this server type, it needs to be copied from the incoming server. All servers in the same cluster must share the same secret.

## RUNNING THE OUTGOING SETUP SCRIPTS

Now the configuration is done, we need to perform the setup operations from the project root directory.

- First thing is to clean and install the npm modules, so change directory to the root of he project and run these commands:
``` sh
rm -rf node_modules
npm cache clean
npm install
```
- Make the folders for the generated RSA keys to be stored in
``` sh
mkdir keys keys/private keys/public
```
- Then run the setup command
``` sh
npm run setup
```
  * If your softcoin wallet was unencrypted and you've set the global encryptedWallet flag to `true` it will encrypt the wallet with the walletpassphrase you set in the incoming settings file and ask you to restart softcoind. Then run the setup again
``` sh
npm run setup
```
  * If your subchain wallet was unencrypted and you've set the global encryptedWallet flag to `true` it will encrypt the wallet with the walletpassphrase you set in the incoming settings file and ask you to restart softajoanonsubchaind. Then run the setup again
``` sh
npm run setup
```
- If your softcoin and subchain were already encrypted or they were encrypted using the steps above, your wallet will now begin to generate a pool of Soft Coin and Subchain addresses to use for transactions. You should see status messages appear with wallet addresses. Wait for this process to complete.

- After generating the addresses, it should let you know that the operation was successful.

- You have the option of running the compiled version of SOFTNode which we release or building your own. If you are happy to run what we have distributed then skip this step otherwise, run the following command to build your version:
``` sh
npm run build
```
This should generate 2 files in the /dist directory: softnode.js and vendor.js

The vendor file links to all the included libraries while the softnode file is the compressed and uglified version of the softnode anon processing scripts.

- We recommend using a service called forever js to manage the softnode server for you. It will restart the application if it were to crash and also consolidate and version any error logs which are produced.
``` sh
npm install -g forever
```
- Start the outgoing server and check there were no problems
``` sh
forever start dist/softnode.js
```

- This should send a test email to your selected notification email address to make sure that is working. Then check the logs.
``` sh
forever logs 0
```
- The logs which are displayed should simply let you know the server has started. If this is the first server you have setup it will also report it was unable to contact an outgoing server. You can test the server is running by opening your browser and softigating to your server's IP address and port eg. https://5.230.146.212:3000

- We use generated unsigned SSL certificates, so proceed past the invalid SSL certificate and you should see a response like:
```
{"status":200,"type":"SUCCESS","message":"server is running!", "anonhash": "e0396962abef360221920beec1c08c18"}
```
If you see this message, your outgoing server is ready to accept transactions.

- Now we need to send the outgoing server Soft Coins to send to the outgoing server. First, get an account address
```
./softcoind getaccountaddress outgoingAccount
```

- And send SOFT to the echoed address split into 1000 SOFT transactions to the maximum value of the pool size you specified. The reason why we split it up is because a wallet can only spend (and receive change from) a transaction once per block. So if we had all our SOFT in 1 transaction to start with the server would have trouble processing more than 1 transaction at a time.
```
./softcoind sendtoaddress NgzWzvQBk6o18nsEFoh6Ub53U6eg1qvtFu 1000
```

# ADDITIONAL NOTES

Now you have both servers setup, it is time to send some test transactions. Make sure you put the correct IP addresses, port number and anonhash parameter into your softcoin.conf file and send some small value test transactions though your SOFTNode servers.

If you are happy with your configuration and transactions are processing successfully you will want to remove the GLOBAL.maintenance and GLOBAL.allowedIps settings from your config/default.js file so the servers are open for public use.

Then head along to http://reddit.com/r/SOFTNodeAnon and submit your servers for public use.

## MULTIPLE INCOMING AND OUTGOING SERVERS

If you want to setup multiple incoming and outgoing servers in your cluster the setup process is the same for each one. The only extra things you will need to remember are to add all your outgoing servers to the INCOMING.remote arrays and all your incoming servers to your OUTGOING.remote arrays so the servers can all talk to eachother.

## RESTARTING SERVERS

There should be some caution taken when restarting the SOFTNode service or restarting the server. The chances are very small because the transaction cycle completes pretty quickly, but it is not recommended to shut the server down while it is in the act of processing transactions. I have created an endpoint to see the server status so you can choose a time between cycles to stop the service

https://95.183.53.184:3000/api/status

It shows whether the server is currently processing, is paused and the time till the next cycle is due to start.

This should give you ample information to be able to gracefully shut the server down between cycles using the forever command.
``` sh
forever stop 0
```
