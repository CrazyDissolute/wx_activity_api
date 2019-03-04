'use strict'

const crypto = use('crypto')
const Crypto = use('crypto')

class WXBizDataCryptFnClass {

  static async decryptData(appId, sessionKey, encryptedData, iv) {
    let decoded = ''

    sessionKey = new Buffer.from(sessionKey, 'base64')
    encryptedData = new Buffer.from(encryptedData, 'base64')
    iv = new Buffer.from(iv, 'base64')

    try {
      // 解密
      let decipher = await crypto.createDecipheriv('aes-128-cbc', sessionKey, iv)
      // 设置自动 padding 为 true，删除填充补位
      decipher.setAutoPadding(true)
      decoded = decipher.update(encryptedData, 'binary', 'utf8')
      decoded += decipher.final('utf8')
      decoded = JSON.parse(decoded)
    } catch (err) {
      console.log(err)
      throw new Error('Illegal Buffer')
    }

    if (decoded.watermark.appid !== appId) {
      throw new Error('Illegal Buffer')
    }
    return decoded
  }

}

module.exports = WXBizDataCryptFnClass
