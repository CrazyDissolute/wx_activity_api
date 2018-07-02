'use strict'

const Database = use('Database')
const User = use('App/Models/User')

const got = use('got')
// const WXBizDataCrypt = use('App/Helpers/WXBizDataCrypt')
const WXBizDataCrypt = use('App/Helpers/newWXBizDataCrypt')

const { wxCF } = use('App/Helpers/config')
const { appid, secret } = wxCF()

class AuthController {

	async login({request, response, auth}){

	  const {encryptedData, iv, code} = request.post()
		if(encryptedData && iv && code){
      let userInfo = await got(`https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`)
      let sessionKey = JSON.parse(userInfo.body).session_key
      // let pc = new WXBizDataCrypt(appid, sessionKey)
      // let data = pc.decryptData(encryptedData , iv)
      let data = await WXBizDataCrypt.decryptData(appid, sessionKey, encryptedData , iv)

      const saveData = {
          unionid: data.unionId,
          nickname: data.nickName,
          avatarurl: data.avatarUrl,
          comefrom: 1
      }

			const user = await User.findOrCreate( { unionid: data.unionId }, saveData)
			//const {id, nickname, unionid} = user

			const token = await auth.generate(user)

      return response.status(200).json({
        message: 'Ok',
        unionId: data.unionId,
        openId: data.openId,
        token: token.token
      })
		}

		return response.status(200).json({
			message: '请求数据失败!'
		})

	}

}

module.exports = AuthController
