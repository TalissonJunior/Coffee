import { GluegunToolbox } from 'gluegun'
import * as _ from 'lodash'
import * as mysql from 'mysql'
import { ConnectionString } from '../models/connection-string'

module.exports = (toolbox: GluegunToolbox) => {
  const {} = toolbox

  toolbox.database = {
    validateConnection: validateConnection
  }

  function _checkConnection(
    connection: ConnectionString
  ): Promise<mysql.MysqlError | boolean> {
    const conn = mysql.createConnection({
      host: connection.hostname,
      user: connection.username,
      database: connection.schema,
      password: connection.password
    })

    return new Promise((resolve, reject) => {
      conn.connect(function(err) {
        if (err) {
          reject(err)
          conn.end()
        }

        resolve(true)
        conn.end()
      })
    })
  }

  async function validateConnection(connection: ConnectionString) {
    if (!connection) {
      return { isValid: false, message: 'Must provide a valid connection' }
    } else if (!connection.hostname) {
      return { isValid: false, message: 'Must provide a valid Hostname' }
    } else if (!connection.username) {
      return { isValid: false, message: 'Must provide a valid Username' }
    } else if (!connection.schema) {
      return { isValid: false, message: 'Must provide a valid schema' }
    } else if (!connection.password) {
      return { isValid: false, message: 'Must provide a valid password' }
    } else {
      try {
        await _checkConnection(connection)
        return { isValid: true, message: null }
      } catch (error) {
        return { isValid: false, message: error.message }
      }
    }
  }
}
