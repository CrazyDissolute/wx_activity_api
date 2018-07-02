'use strict'

const got = use('got')

const { wxCF } = use('App/Helpers/config')
const { appid, secret } = wxCF()

const Redis = use('Redis')

class Checkss {
  async handle ({ request, response, auth }, next) {
	//console.log(auth.getAuthHeader())
	try {
		await auth.check()
		const token = await auth.getUser()

    request.body.userInfo = { id: token.id, unionid: token.unionid }

		const cachedUsers =  await Redis.get('wx_access_token')
		if(!cachedUsers){
			let wxCode = await got.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`, {})
			let codeKey = JSON.parse(wxCode.body).access_token

			await Redis.set('wx_access_token', codeKey, 'EX', 7000)
			request.body.wx_access_token = codeKey
		}else{
			request.body.wx_access_token = cachedUsers
		}

		await next()

	} catch (error) {

		return response.json({
			message: 'Missing or invalid jwt token',
			error
		})

	}

    //await next()
  }
}

module.exports = Checkss
