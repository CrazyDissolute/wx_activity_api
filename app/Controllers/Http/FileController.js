'use strict'

const Helpers = use('Helpers')
const Drive = use('Drive')

class FileController {
	
	async pictures({request, response, params}){
		//return response.json({})

		const oldPic = Helpers.appRoot('upload')+'/'+params[0]
		const exists = await Drive.exists(oldPic)
		if(exists){
			return response.download(oldPic)
		}else{
			return response.status(404).json({message: '找不到图片', par: params[0]})
		}
		
    }
	
}

module.exports = FileController
