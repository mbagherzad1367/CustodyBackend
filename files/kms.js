const { KeyManagementServiceClient } = require("@google-cloud/kms");
const {
  KMSClient,
  EncryptCommand,
  DecryptCommand,
} = require("@aws-sdk/client-kms");
const { WHICH_CLOUD } = require("./constants");

const KMS_KEYS = {
  key1:
    WHICH_CLOUD === "VM" ? process.env.VM_KMS_KEY_1 : process.env.GCP_KMS_KEY_1,
  key2:
    WHICH_CLOUD === "VM" ? process.env.VM_KMS_KEY_2 : process.env.GCP_KMS_KEY_2,
  key3:
    WHICH_CLOUD === "VM" ? process.env.VM_KMS_KEY_3 : process.env.GCP_KMS_KEY_3,
};

let kmsClient;
let encryptWithGCPKMS;
let decryptWithGCPKMS;
if (WHICH_CLOUD === "LOCAL") {
  encryptWithGCPKMS = async (plaintext) => {
    console.log("🧪 Local KMS mock encryption");
    return Buffer.from(`ENCRYPTED:${plaintext}`).toString("base64");
  };

  decryptWithGCPKMS = async (ciphertextBase64) => {
    console.log("🧪 Local KMS mock decryption");
    const text = Buffer.from(ciphertextBase64, "base64").toString("utf-8");
      if (text.startsWith("ENCRYPTED:")) {
    return text.replace("ENCRYPTED:", "");
  }
      else {
        return ciphertextBase64;
      }
  };
}
if (WHICH_CLOUD === "AZURE") {
  try {
    const decoded = Buffer.from(
      process.env.GCP_SERVICE_ACCOUNT_JSON,
      "base64"
    ).toString("utf8");

    const gcpKey = JSON.parse(decoded);

    kmsClient = new KeyManagementServiceClient({
      credentials: gcpKey,
      projectId: gcpKey.project_id,
    });
  } catch (error) {
    console.error("❌ Failed to initialize GCP KMS client:", error);
  }

  // encryption
  encryptWithGCPKMS = async (plaintext, keyName) => {
    const [result] = await kmsClient.encrypt({
      name: keyName,
      plaintext: Buffer.from(plaintext, "utf-8"),
    });

    if (!result.ciphertext) throw new Error("GCP KMS encryption failed");

    // Store ciphertext as base64
    return Buffer.from(result.ciphertext).toString("base64");
  };

  // decryption
  decryptWithGCPKMS = async (ciphertextBase64, keyName) => {
    const [result] = await kmsClient.decrypt({
      name: keyName,
      ciphertext: Buffer.from(ciphertextBase64, "base64"),
    });

    return Buffer.from(result.plaintext).toString("utf-8");
  };
} else if (WHICH_CLOUD === "GCP") {
  kmsClient = new KeyManagementServiceClient();

  // encryption
  encryptWithGCPKMS = async (plaintext, keyName) => {
    const [result] = await kmsClient.encrypt({
      name: keyName,
      plaintext: Buffer.from(plaintext, "utf-8"),
    });

    if (!result.ciphertext) throw new Error("GCP KMS encryption failed");

    // Store ciphertext as base64
    return Buffer.from(result.ciphertext).toString("base64");
  };

  // decrypt
  decryptWithGCPKMS = async (ciphertextBase64, keyName) => {
    const [result] = await kmsClient.decrypt({
      name: keyName,
      ciphertext: Buffer.from(ciphertextBase64, "base64"),
    });

    return Buffer.from(result.plaintext).toString("utf-8");
  };
} else if (WHICH_CLOUD === "VM") {
  // Use AWS KMS when running on VM
  kmsClient = new KMSClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  encryptWithGCPKMS = async (plaintext, keyId) => {
    const command = new EncryptCommand({
      KeyId: keyId,
      Plaintext: Buffer.from(plaintext, "utf-8"),
    });
    const response = await kmsClient.send(command);
    if (!response.CiphertextBlob) throw new Error("AWS KMS encryption failed");
    return Buffer.from(response.CiphertextBlob).toString("base64");
  };

  decryptWithGCPKMS = async (ciphertextBase64) => {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertextBase64, "base64"),
    });
    const response = await kmsClient.send(command);
    return Buffer.from(response.Plaintext).toString("utf-8");
  };
}

module.exports = {
  encryptWithGCPKMS,
  decryptWithGCPKMS,
  KMS_KEYS,
};
