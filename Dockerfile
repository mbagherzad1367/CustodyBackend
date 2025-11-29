FROM node:18-alpine
EXPOSE 80
EXPOSE 8000

ENV JWT_SECRET_KEY=********** \
  JWT_EXPIRES_IN=5d \
  NODE_ENV=development \
  WHICH_CLOUD="LOCAL" \
  DEPLOYMENT_TYPE="qa" \
  NODE_SERVER="server" \
  EXC_ROOT="http://localhost:3000" \
  EMAIL_HOST="smtp-relay.brevo.com" \
  EMAIL_PORT=587 \
  EMAIL_PASSWORD=********** \
  EMAIL_USERNAME="info@paywithcrypto.tech" \
  AZURE_STORAGE_CONNECTION_STRING=********** \
  AZURE_STORAGE_VERIFICATION_FOLDER="verification-files" \
  TWILIO_ACCOUNT_SID=********** \
  SERVER_BASE_URL="https://chain-journey-backend-239932986681.us-central1.run.app/api/v1" \
  BTC_INFURA_TESTNET=********** \
  ETH_INFURA_TESTNET=********** \
  USDC_BSC_INFURA_TESTNET=********** \
  USDT_BSC_INFURA_TESTNET=********** \
  USDC_ERC20_INFURA_TESTNET=********** \
  USDT_ERC20_INFURA_TESTNET=********** \
  USDC_POLYGON_INFURA_TESTNET=********** \
  USDT_POLYGON_INFURA_TESTNET=********** \
  USDC_e_POLYGON_INFURA_TESTNET=********** \
  BTC_QUICKNODE_MAINNET=********** \
  ETH_QUICKNODE_MAINNET=********** \
  USDC_BSC_QUICKNODE_MAINNET=********** \
  USDT_BSC_QUICKNODE_MAINNET=********** \
  USDC_ERC20_QUICKNODE_MAINNET=********** \
  USDT_ERC20_QUICKNODE_MAINNET=********** \
  USDC_POLYGON_QUICKNODE_MAINNET=********** \
  USDT_POLYGON_QUICKNODE_MAINNET=********** \
  USDC_e_POLYGON_QUICKNODE_MAINNET=********** \
  TESTNET_USDC_ERC20_CONTRACT=********** \
  TESTNET_USDT_ERC20_CONTRACT=********** \
  TESTNET_USDC_BSC_CONTRACT=********** \
  TESTNET_USDT_BSC_CONTRACT=********** \
  TESTNET_USDC_POLYGON_CONTRACT=********** \
  TESTNET_USDC_e_POLYGON_CONTRACT=********** \
  TESTNET_USDT_POLYGON_CONTRACT=********** \
  TESTNET_USDC_TRC20_CONTRACT=********** \
  TESTNET_USDT_TRC20_CONTRACT=********** \
  MAINNET_USDC_ERC20_CONTRACT=********** \
  MAINNET_USDT_ERC20_CONTRACT=********** \
  MAINNET_USDC_BSC_CONTRACT=********** \
  MAINNET_USDT_BSC_CONTRACT=********** \
  MAINNET_USDC_POLYGON_CONTRACT=********** \
  MAINNET_USDC_e_POLYGON_CONTRACT=********** \
  MAINNET_USDT_POLYGON_CONTRACT=********** \
  MAINNET_USDC_TRC20_CONTRACT=********** \
  MAINNET_USDT_TRC20_CONTRACT=********** \
  TWILIO_AUTH_TOKEN=********** \
  TWO_FACTOR_SECRET=********** \
  EXCHANGE_LOGS_FILENAME="error-logs.log" \
  AZURE_STORAGE_LOGS_FOLDER="logs" \
  MISSTRACK_API_KEY=********** \
  MISTTRACK_URL="https://openapi.misttrack.io/v1" \
  LEGAL_AGREEMENTS_FOLDER="legal-agreements" \
  ALCHEMY_API_KEY=********** \
  NETWORK="MAINNET" \
  QUICKNODE_API=********** \
  ETHERSCAN_API_KEY=********** \
  BNBSCAN_API_KEY=********** \
  MATICSCAN_API_KEY=********** \
  FRONT_END_URL="https://custody.paidgate.com/sign-in" \
  GCP_KMS_KEY_1="projects/nodika-425509/locations/global/keyRings/custody-azure-dev-key-1/cryptoKeys/custody-azure-dev-key-1" \
  GCP_KMS_KEY_2="projects/nodika-425509/locations/global/keyRings/custody-azure-dev-key-2/cryptoKeys/custody-azure-dev-key-2" \
  GCP_KMS_KEY_3="projects/nodika-425509/locations/global/keyRings/custody-azure-dev-key-3/cryptoKeys/custody-azure-dev-key-3" \
  GCP_SERVICE_ACCOUNT_JSON=**********

WORKDIR /usr/app

COPY package*.json ./
RUN npm install sequelize-cli -g
RUN npm install pm2 -g

COPY . .
RUN npm cache clean --force && rm -rf node_modules && npm install

CMD [ "node", "server.js" ]