'use strict'

const Schema = use('Schema')

class UserSchema extends Schema {
  up () {
    this.create('users', (table) => {
      table.increments()
      table.string('username', 80)//.notNullable().unique()
      table.string('email', 254)//.notNullable().unique()
      table.string('password', 60)//.notNullable(),
      table.string('unionid', 64)
      table.string('nickname', 64)
      table.string('avatarurl', 255)
      table.integer('comefrom', 1)
      table.timestamps()
    })
  }

  down () {
    this.drop('users')
  }
}

module.exports = UserSchema
