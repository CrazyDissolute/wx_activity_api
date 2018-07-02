'use strict'

const crypto = use('crypto')

class WXBizDataCryptFnClass {

  static async decryptData(appId, sessionKey, encryptedData, iv){

      sessionKey = new Buffer(sessionKey, 'base64')

      encryptedData = new Buffer(encryptedData, 'base64')

      iv = new Buffer(iv, 'base64')

      let decoded = ''

      try {

        // 解密
        let decipher = await crypto.createDecipheriv('aes-128-cbc', sessionKey, iv)

        // 设置自动 padding 为 true，删除填充补位
        decipher.setAutoPadding(true)

        decoded = decipher.update(encryptedData, 'binary', 'utf8')

        decoded += decipher.final('utf8')

        decoded = JSON.parse(decoded)


      } catch (err) {

        //throw new Error('Illegal Buffer')
        
        // 解密
        let decipher = await crypto.createDecipheriv('aes-128-cbc', sessionKey, iv)

        // 设置自动 padding 为 true，删除填充补位
        decipher.setAutoPadding(true)

        decoded = decipher.update(encryptedData, 'binary', 'utf8')

        decoded += decipher.final('utf8')

        decoded = JSON.parse(decoded)

      }

      if (decoded.watermark.appid !== appId) {

        throw new Error('Illegal Buffer')

      }

      return decoded


  }

}

module.exports = WXBizDataCryptFnClass
