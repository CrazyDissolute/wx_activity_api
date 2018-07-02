'use strict'

const Schema = use('Schema')

class ActivityPhotosSchema extends Schema {
  up () {
    this.create('activity_photos', (table) => {
      table.increments()
      table.integer('activity_id', 8)
      table.integer('unionid', 8)
      table.string('photo_url', 128)
      table.timestamps()
    })
  }

  down () {
    this.drop('activity_photos')
  }
}

module.exports = ActivityPhotosSchema
