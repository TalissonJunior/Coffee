import { GluegunToolbox, filesystem } from 'gluegun'
import * as _ from 'lodash'
import { ConnectionString } from '../models/connection-string'

module.exports = (toolbox: GluegunToolbox) => {
  const {
    print,
    config,
    template: { generate },
    prompt
  } = toolbox

  toolbox.dotnetcore = {
    updateEntitiesAndContext: updateEntitiesAndContext,
    updateDomains: updateDomains,
    checkConnectionString: checkConnectionString,
    updateMigrations: updateMigrations
  }

  async function updateMigrations() {
    await checkConnectionString()
    const spinner = print.spin()
    spinner.start()

    spinner.text = 'Checking configuration file ...'

    const projectConfig = await filesystem.readAsync(
      filesystem.path(filesystem.cwd(), config.project.configFileName)
    )

    if (!projectConfig) {
      spinner.stop()
      print.info(`Coudn´t find the ${config.project.configFileName} file`)
      return
    }

    // Get webapi folder
    const infrastructureFolder = JSON.parse(projectConfig).architecture
      .infrastructure

    try {
      spinner.text = 'Running migrations...'

      let latestVersionChangeVersion = await toolbox.designer.getLatestDesignerFileVersion()

      // Check latest version change
      if (
        latestVersionChangeVersion == null ||
        latestVersionChangeVersion === '1.0.0'
      ) {
        latestVersionChangeVersion = 'InitialCreate'
      }

      await toolbox.system.run(
        `cd ${infrastructureFolder} && ` +
          ` dotnet ef migrations add ${latestVersionChangeVersion}`,
        {
          trim: true
        }
      )

      spinner.text = 'Updating database...'

      await toolbox.system.run(
        `cd ${infrastructureFolder} && ` + ` dotnet ef database update`,
        {
          trim: true
        }
      )

      spinner.stop()
    } catch (e) {
      spinner.stop()
      print.info(`${print.xmark} fail to run migrations`)
      print.info(`${print.xmark} ${e.message}`)
      return
    }
  }

  async function checkConnectionString() {
    const spinner = print.spin()
    let connection: ConnectionString = null
    let hasUpdatedConnection = false
    spinner.start()

    spinner.text = 'Checking connection string...'

    const projectConfig = await filesystem.readAsync(
      filesystem.path(filesystem.cwd(), config.project.configFileName)
    )

    if (!projectConfig) {
      spinner.stop()
      print.info(`Coudn´t find the ${config.project.configFileName} file`)
      return
    }

    // Get webapi folder
    const webapiFolderPath = JSON.parse(projectConfig).architecture.webapi

    // Get infrastructure folder
    const infrastructureFolderPath = JSON.parse(projectConfig).architecture
      .infrastructure

    const autofac = require(filesystem.path(
      filesystem.cwd(),
      webapiFolderPath,
      'autofac.json'
    ))

    if (!autofac) {
      spinner.stop()
      print.info(
        `Coudn´t find the ${filesystem.path(
          webapiFolderPath,
          'autofac.json'
        )} file`
      )
      return
    }

    for (let index = 0; index < autofac.modules.length; index++) {
      const mod = autofac.modules[index]

      const isEmptyObject = obj => {
        return Object.entries(obj).length === 0 && obj.constructor === Object
      }

      // Ask for connection string and validate
      // returns the connection if user has input a valid one and null if not
      // will keep asking user until he inputs a valid connection
      const askForConnectionString = async () => {
        let hasValidConnection = false
        let _connection: ConnectionString

        do {
          _connection = (await prompt.ask([
            {
              type: 'input',
              name: 'hostname',
              message: 'What is the Hostname?'
            },
            {
              type: 'input',
              name: 'username',
              message: 'What is the Username?'
            },
            {
              type: 'input',
              name: 'schema',
              message: 'What is the default Schema?'
            },
            {
              type: 'password',
              name: 'password',
              message: 'What is the database Password?'
            }
          ])) as any

          // Default port
          _connection.port = 3306

          spinner.start()
          spinner.text = 'Validating connection...'

          const resultConnection = await toolbox.database.validateConnection(
            _connection
          )

          spinner.stop()
          if (!resultConnection.isValid) {
            print.info(`${print.xmark} ${resultConnection.message}`)
          }

          hasValidConnection = resultConnection.isValid
        } while (!hasValidConnection)

        return _connection
      }

      if (!isEmptyObject(mod.properties) && !mod.properties.ConnectionString) {
        spinner.stop()
        print.info('Coudn´t find a database connection, you must set up one..')

        if (!connection) {
          connection = await askForConnectionString()
          spinner.start()
          spinner.text = 'Updating connection...'

          const connectionString =
            `server=${connection.hostname};` +
            `port=${connection.port};` +
            `database=${connection.schema};` +
            `user=${connection.username};` +
            `password=${connection.password};`

          autofac.modules[index].properties.ConnectionString = connectionString

          hasUpdatedConnection = true
        }
        // if has found another connectionString property, updated it with
        // the connection passed by the user;
        else {
          spinner.stop()
          spinner.start()
          spinner.text = 'Updating connection...'

          const connectionString =
            `server=${connection.hostname};` +
            `port=${connection.port};` +
            `database=${connection.schema};` +
            `user=${connection.username};` +
            `password=${connection.password};`

          autofac.modules[index].properties.ConnectionString = connectionString
        }

        spinner.stop()
      }
      // If found a connection get it format it and validate;
      else if (
        !isEmptyObject(mod.properties) &&
        mod.properties.ConnectionString
      ) {
        spinner.stop()
        const connectionString =
          autofac.modules[index].properties.ConnectionString

        const arrayParts = connectionString.split(';')

        if (arrayParts.length < 5) {
          print.info(
            `${print.xmark} invalid connection string on "autofac.json"`
          )
          connection = await askForConnectionString()

          spinner.start()
          spinner.text = 'Updating connection...'

          const connectionString =
            `server=${connection.hostname};` +
            `port=${connection.port};` +
            `database=${connection.schema};` +
            `user=${connection.username};` +
            `password=${connection.password};`

          autofac.modules[index].properties.ConnectionString = connectionString

          hasUpdatedConnection = true

          spinner.stop()
        } else {
          spinner.start()
          spinner.text = 'Validating connection...'

          for (let j = 0; j < arrayParts.length; j++) {
            const part = arrayParts[j]

            if (connection == null) {
              connection = new ConnectionString()
            }

            if (part.indexOf('server') > -1) {
              connection.hostname = part.split('=')[1]
            } else if (part.indexOf('port') > -1) {
              connection.port = part.split('=')[1]
            } else if (part.indexOf('database') > -1) {
              connection.schema = part.split('=')[1]
            } else if (part.indexOf('user') > -1) {
              connection.username = part.split('=')[1]
            } else if (part.indexOf('password') > -1) {
              connection.password = part.split('=')[1]
            }
          }

          const resultConnection = await toolbox.database.validateConnection(
            connection
          )

          spinner.stop()

          if (!resultConnection.isValid) {
            print.info(
              `${print.xmark} invalid connection string on "autofac.json"`
            )

            connection = await askForConnectionString()
            spinner.start()
            spinner.text = 'Updating connection...'

            const connectionString =
              `server=${connection.hostname};` +
              `port=${connection.port};` +
              `database=${connection.schema};` +
              `user=${connection.username};` +
              `password=${connection.password};`

            autofac.modules[
              index
            ].properties.ConnectionString = connectionString

            hasUpdatedConnection = true
            spinner.stop()
          }
        }
      }
    }

    spinner.stop()
    spinner.start()
    spinner.text = hasUpdatedConnection
      ? 'Updating autofac.json...'
      : 'Checking autofac.json...'

    // Get autofac file path
    const autofacFile = filesystem.path(webapiFolderPath, 'autofac.json')

    await filesystem.writeAsync(
      filesystem.path(filesystem.cwd(), webapiFolderPath, 'autofac.json'),
      JSON.stringify(autofac)
    )

    spinner.text = 'Formatting autofac.json...'

    // Format autofac.json file
    await toolbox.system.run(
      'prettier --no-semi --trailing-comma --write ' +
        JSON.parse(projectConfig).architecture.webapi +
        '/autofac.json'
    )

    spinner.text = hasUpdatedConnection
      ? 'Updating context.cs...'
      : 'Checking context.cs...'

    // Update context
    const contextFile = filesystem.path(
      infrastructureFolderPath,
      'EntityFrameworkDataAccess',
      'Context.cs'
    )

    const connectionString =
      `server=${connection.hostname};` +
      `port=${connection.port};` +
      `database=${connection.schema};` +
      `user=${connection.username};` +
      `password=${connection.password};`

    const contextFileData = await filesystem.readAsync(contextFile)

    const newFileData = toolbox.schematics.replaceByMatch(
      contextFileData,
      'optionsBuilder.UseMySql(',
      '}',
      `optionsBuilder.UseMySql("${connectionString}");`
    )

    await filesystem.writeAsync(contextFile, newFileData)

    // Format context file
    await toolbox.system.run(
      'prettier --print-width 80 --no-semi --single-quote ' +
        ' --trailing-comma --write ' +
        `${infrastructureFolderPath}/EntityFrameworkDataAccess/Context.cs`
    )

    spinner.stop()

    if (hasUpdatedConnection) {
      print.info(`${print.checkmark} Updated: ${autofacFile}`)
      print.info(`${print.checkmark} Updated: ${contextFile}`)
    }

    return connection
  }

  /**
   * Update dotnet core entities, and context
   */
  async function updateEntitiesAndContext() {
    const spinner = print.spin()
    spinner.start()
    print.newline()

    spinner.text = 'Getting class tables...'

    const classTables = await toolbox.designer.getClassTables()

    if (!classTables) {
      spinner.stop()
      print.info('There is no class tables to update entities.')
      return
    }

    const projectConfig = await filesystem.readAsync(
      filesystem.path(filesystem.cwd(), config.project.configFileName)
    )

    if (!projectConfig) {
      spinner.stop()
      print.info(`Coudn´t find the ${config.project.configFileName} file`)
      return
    }

    spinner.text = 'Generating Entities...'

    // Get infrastructure folder
    const infrastructure = JSON.parse(projectConfig).architecture.infrastructure
    const entitiesFolderPath = filesystem.path(infrastructure, 'Entities')

    // Ensure that server assets is created
    await filesystem.dirAsync(entitiesFolderPath)

    for (let index = 0; index < classTables.length; index++) {
      const classTable = classTables[index]

      await generate({
        template: 'generator/dotnetCore/infrastructure/entity.ts.ejs',
        target: filesystem.path(entitiesFolderPath, classTable.name + '.cs'),
        props: {
          classTable: classTable,
          projectName: JSON.parse(projectConfig).architecture.name
        }
      })

      print.info(
        `${print.checkmark} Created: ${filesystem.path(
          entitiesFolderPath,
          classTable.name + '.cs'
        )}`
      )
    }

    spinner.text = 'Generating Context...'

    // Create context
    const entityFrameworkFolderPath = filesystem.path(
      infrastructure,
      'EntityFrameworkDataAccess'
    )

    await generate({
      template: 'generator/dotnetCore/infrastructure/context.ts.ejs',
      target: filesystem.path(entityFrameworkFolderPath, 'Context.cs'),
      props: {
        classTables: classTables,
        middleTables: classTables.filter(ct => ct.isMiddleTable),
        projectName: JSON.parse(projectConfig).architecture.name
      }
    })

    spinner.stop()
    print.info(
      `${print.checkmark} Created: ${filesystem.path(
        entityFrameworkFolderPath,
        'Context.cs'
      )}`
    )
    spinner.start()

    // Format entities files
    await toolbox.system.run(
      'prettier --print-width 80 --no-semi --single-quote ' +
        ' --trailing-comma --write ' +
        JSON.parse(projectConfig).architecture.infrastructure +
        '/**/*.cs'
    )

    spinner.text = 'Generating Mappings...'

    // Create Mappings
    const mappingsFolderPath = filesystem.path(infrastructure, 'Mappings')

    await generate({
      template: 'generator/dotnetCore/infrastructure/mapping.ts.ejs',
      target: filesystem.path(mappingsFolderPath, 'MappingProfile.cs'),
      props: {
        classTables: classTables,
        projectName: JSON.parse(projectConfig).architecture.name
      }
    })

    spinner.stop()
    print.newline()
    print.info(
      `${print.checkmark} Created: ${filesystem.path(
        mappingsFolderPath,
        'MappingProfile.cs'
      )}`
    )
    spinner.start()

    // Format mappings files
    await toolbox.system.run(
      'prettier --print-width 80 --no-semi --single-quote ' +
        ' --trailing-comma --write ' +
        JSON.parse(projectConfig).architecture.infrastructure +
        '/**/*.cs'
    )

    spinner.stop()
  }

  /**
   * Update dotnet core domains, and context
   */
  async function updateDomains() {
    const spinner = print.spin()
    spinner.start()
    print.newline()

    spinner.text = 'Getting class tables...'

    const classTables = await toolbox.designer.getClassTables()

    if (!classTables) {
      spinner.stop()
      print.info('There is no class tables to update domains.')
      return
    }

    const projectConfig = await filesystem.readAsync(
      filesystem.path(filesystem.cwd(), config.project.configFileName)
    )

    if (!projectConfig) {
      spinner.stop()
      print.info(`Coudn´t find the ${config.project.configFileName} file`)
      return
    }

    spinner.text = 'Generating Domains...'

    const domain = JSON.parse(projectConfig).architecture.domain
    const domainsFolderPath = filesystem.path(domain)

    // Ensure that server assets is created
    await filesystem.dirAsync(domainsFolderPath)

    for (let index = 0; index < classTables.length; index++) {
      const classTable = classTables[index]

      // Order by isRequired
      classTable.properties = _.orderBy(
        classTable.properties,
        ['isRequired'],
        ['desc']
      )

      if (!classTable.isMiddleTable) {
        // Create folder class directory
        const folderPath = filesystem.path(domainsFolderPath, classTable.name)
        await filesystem.dirAsync(folderPath)

        await generate({
          template: 'generator/dotnetCore/infrastructure/domain.ts.ejs',
          target: filesystem.path(folderPath, classTable.name + '.cs'),
          props: {
            classTable: classTable,
            projectName: JSON.parse(projectConfig).architecture.domain
          }
        })

        spinner.stop()
        print.info(
          `${print.checkmark} Created: ${filesystem.path(
            folderPath,
            classTable.name + '.cs'
          )}`
        )
        spinner.start()
      }
    }

    spinner.text = 'Fomarting Domains...'

    // Format domain files
    await toolbox.system.run(
      'prettier --print-width 80 --no-semi --single-quote ' +
        ' --trailing-comma --write ' +
        JSON.parse(projectConfig).architecture.domain +
        '/**/*.cs'
    )

    spinner.stop()
  }
}
