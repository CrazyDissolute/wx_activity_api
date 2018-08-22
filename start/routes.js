'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.0/routing
|
*/

const Route = use('Route')

Route.group(()=>{

  Route.get('/', ({ request, response }) => {
    return response.status(200).json({ greeting: '欢迎使用API' })
  })

  Route.get('pictures/(.*/?)', 'FileController.pictures')

  Route.post('login', 'AuthController.login')

  Route.post('newActivity', 'ActivityController.newActivity').middleware(['checkss', 'auth'])

  Route.post('editActivity/:id', 'ActivityController.editActivity').middleware(['checkss', 'auth'])

  Route.get('getActivity/:id', 'ActivityController.getActivity').middleware(['checkss', 'auth'])

  Route.get('listActivity', 'ActivityController.listActivity')

  Route.post('joinActivity', 'ActivityController.joinActivity').middleware(['checkss', 'auth'])

  Route.post('checkJoin', 'ActivityController.checkJoin')

  Route.get('getJoin/:id', 'ActivityController.getJoin').middleware(['checkss', 'auth'])

  Route.get('getTheme', 'ActivityController.getTheme')

  Route.post('changeActStatus', 'ActivityController.changeActStatus').middleware(['checkss', 'auth'])

  Route.post('uploadFile', 'ActivityController.uploadFile').middleware(['checkss', 'auth'])

  Route.post('signActivity', 'ActivityController.signActivity').middleware(['checkss', 'auth'])

  Route.get('getGlory', 'ActivityController.getGlory')

  Route.post('destroyPhoto', 'ActivityController.destroyPhoto').middleware(['checkss', 'auth'])

  Route.get('myActivity', 'ActivityController.myActivity').middleware(['checkss', 'auth'])

  Route.get('upateStatus/:id', 'ActivityController.upateStatus')

  Route.get('remind/:id', 'ActivityController.remind')

  Route.get('test', 'ActivityController.test')

}).prefix('/wedemo/v0/')
