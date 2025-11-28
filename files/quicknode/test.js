const testwebhook = async (req, res, next) => {
  console.log("ETH_token_RES:", JSON.stringify(req.body, null, 2));

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Webhook received");
};

module.exports = { testwebhook };
