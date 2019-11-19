import { GluegunToolbox } from 'gluegun'
import * as _ from 'lodash'

module.exports = (toolbox: GluegunToolbox) => {
  const {
    print,
    prompt,
    filesystem,
    template: { generate },
    config
  } = toolbox

  toolbox.usecase = {
    create
  }

  async function create() {
    const spinner = print.spin()

    spinner.text = 'Checking project configurations...'

    const isInsideDotnetCore = await toolbox.dependencies.isInsideDotnetCore()

    if (!isInsideDotnetCore) {
      spinner.stop()
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

    spinner.stop()

    const classTables = await toolbox.designer.getClassTables()

    if (!classTables || classTables.lenth === 0) {
      spinner.fail('Coudn´t find any models')
      print.info('To create models type:')
      print.info('  coffee designer')
      return
    }

    const models = classTables
      .filter(ct => !ct.isMiddleTable)
      .map(ct => ct.name)

    spinner.start()
    spinner.text = 'Checking repositorires...'

    // Get folders
    const applicationFolderPath = JSON.parse(projectConfig).architecture
      .application
    const webapiFolderPath = JSON.parse(projectConfig).architecture.webapi

    const repositoriesApplicationFolderPath = filesystem.path(
      applicationFolderPath,
      'Repositories'
    )
    const outputsApplicationFolderPath = filesystem.path(
      applicationFolderPath,
      'Outputs'
    )
    const inputsApplicationFolderPath = filesystem.path(
      applicationFolderPath,
      'Inputs'
    )
    const useCasesApplicationFolderPath = filesystem.path(
      applicationFolderPath,
      'UseCases'
    )
    const useCasesWebApiFolderPath = filesystem.path(
      webapiFolderPath,
      'UseCases'
    )
    const treeRepositories = await filesystem.inspectTreeAsync(
      repositoriesApplicationFolderPath
    )

    if (
      !treeRepositories ||
      !treeRepositories.children ||
      treeRepositories.children.length === 0
    ) {
      spinner.fail('Coudn´t find any repository')
      print.info('To create an repository type:')
      print.info('  coffee generate repository')
      return
    }

    const availableRepositories = treeRepositories.children
      .filter(child => child.type === 'file')
      .map(child => child.name.replace('.cs', ''))

    spinner.stop()

    const prompResult = await prompt.ask([
      {
        type: 'input',
        name: 'usecaseName',
        message: 'Enter a name for the usecase'
      },
      {
        type: 'select',
        name: 'modelName',
        message: 'Which model do you want to use?',
        choices: models
      },
      {
        type: 'multiselect',
        name: 'selectedRepositories',
        message: 'Which repositories do you want to use?',
        choices: availableRepositories
      },
      {
        type: 'input',
        name: 'routeName',
        message: 'Enter a name for the api route name'
      },
      {
        type: 'radio',
        name: 'methodType',
        message: 'Select the api route method type',
        choices: ['GET', 'PUT', 'POST', 'DELETE']
      }
    ])

    if (!prompResult.usecaseName) {
      spinner.fail('You must provide a valid usecase name.')
      return
    } else if (!prompResult.modelName) {
      spinner.fail('You must select a valid model name.')
      return
    } else if (
      !prompResult.selectedRepositories ||
      prompResult.selectedRepositories.length === 0
    ) {
      spinner.fail('You must select at least one repository.')
      return
    }

    // Format usecasename
    prompResult.usecaseName = toolbox.strings.pascalCase(
      prompResult.usecaseName
        .replace(/UseCase/g, '')
        .replace(/usecase/g, '')
        .replace(/useCase/g, '')
        .replace(/Usecase/g, '')
    )

    // Wheter the usecase return is a list or not
    let isList = false

    if (
      (prompResult.methodType === 'GET' &&
        prompResult.usecaseName.toLowerCase().indexOf('all') > -1) ||
      (prompResult.methodType === 'GET' &&
        toolbox.strings.isPlural(prompResult.usecaseName))
    ) {
      isList = true
    }

    spinner.start()

    // Ensure that folder path is created
    await filesystem.dirAsync(outputsApplicationFolderPath)

    const classTable = classTables.find(ct => ct.name === prompResult.modelName)

    // Order by isRequired
    classTable.properties = _.orderBy(
      classTable.properties,
      ['isRequired'],
      ['desc']
    )

    // Create the application outpus if it is GET
    spinner.text = 'Checking model outputs...'

    const outputFilePath = filesystem.path(
      outputsApplicationFolderPath,
      `${prompResult.modelName}Output.cs`
    )

    if (!(await filesystem.existsAsync(outputFilePath))) {
      // Create Application output
      await generate({
        template: 'generator/dotnetCore/application/output.ts.ejs',
        target: outputFilePath,
        props: {
          classTable,
          projectName: JSON.parse(projectConfig).architecture.name
        }
      })

      // Format Application output
      await toolbox.system.run(
        'prettier --print-width 80 --no-semi --single-quote ' +
          ' --trailing-comma --write ' +
          `${applicationFolderPath}/Outputs/${prompResult.modelName}Output.cs`
      )

      spinner.stop()
      print.newline()

      spinner.succeed('Created: ' + outputFilePath)

      spinner.start()
    }

    // Create output table dependencies
    if (classTable.hasRelations) {
      for (let index = 0; index < classTable.tableRelations.length; index++) {
        const tableRelation = classTable.tableRelations[index]
        let foreignTable

        if (
          tableRelation.firstMiddleTablePropety.foreign.table !==
          classTable.name
        ) {
          foreignTable = classTables.find(
            ct =>
              ct.name === tableRelation.firstMiddleTablePropety.foreign.table
          )
        } else {
          foreignTable = classTables.find(
            ct =>
              ct.name === tableRelation.secondMiddleTablePropety.foreign.table
          )
        }

        const outputForeignFilePath = filesystem.path(
          outputsApplicationFolderPath,
          `${foreignTable.name}Output.cs`
        )

        if (!(await filesystem.existsAsync(outputForeignFilePath))) {
          await generate({
            template: 'generator/dotnetCore/application/output.ts.ejs',
            target: outputForeignFilePath,
            props: {
              classTable: foreignTable,
              projectName: JSON.parse(projectConfig).architecture.name
            }
          })

          // Format Application output
          await toolbox.system.run(
            'prettier --print-width 80 --no-semi --single-quote ' +
              ' --trailing-comma --write ' +
              `${applicationFolderPath}/Outputs/${foreignTable.name}Output.cs`
          )

          spinner.stop()
          print.newline()

          spinner.succeed('Created: ' + outputForeignFilePath)

          spinner.start()
        }
      }
    }

    // Create inputs
    if (prompResult.methodType !== 'GET') {
      spinner.text = 'Checking model inputs...'

      const inputFilePath = filesystem.path(
        inputsApplicationFolderPath,
        `${prompResult.modelName}Input.cs`
      )

      if (!(await filesystem.existsAsync(inputFilePath))) {
        // Create Application input
        await generate({
          template: 'generator/dotnetCore/application/input.ts.ejs',
          target: inputFilePath,
          props: {
            classTable,
            projectName: JSON.parse(projectConfig).architecture.name
          }
        })

        // Format Application input
        await toolbox.system.run(
          'prettier --print-width 80 --no-semi --single-quote ' +
            ' --trailing-comma --write ' +
            `${applicationFolderPath}/Inputs/${prompResult.modelName}Input.cs`
        )

        spinner.stop()
        print.newline()

        spinner.succeed('Created: ' + inputFilePath)

        spinner.start()
      }

      // Create input table dependencies
      if (classTable.hasRelations) {
        for (let index = 0; index < classTable.tableRelations.length; index++) {
          const tableRelation = classTable.tableRelations[index]
          let foreignTable

          if (
            tableRelation.firstMiddleTablePropety.foreign.table !==
            classTable.name
          ) {
            foreignTable = classTables.find(
              ct =>
                ct.name === tableRelation.firstMiddleTablePropety.foreign.table
            )
          } else {
            foreignTable = classTables.find(
              ct =>
                ct.name === tableRelation.secondMiddleTablePropety.foreign.table
            )
          }

          const inputForeignFilePath = filesystem.path(
            inputsApplicationFolderPath,
            `${foreignTable.name}Input.cs`
          )

          if (!(await filesystem.existsAsync(inputForeignFilePath))) {
            await generate({
              template: 'generator/dotnetCore/application/input.ts.ejs',
              target: inputForeignFilePath,
              props: {
                classTable: foreignTable,
                projectName: JSON.parse(projectConfig).architecture.name
              }
            })

            // Format Application input
            await toolbox.system.run(
              'prettier --print-width 80 --no-semi --single-quote ' +
                ' --trailing-comma --write ' +
                `${applicationFolderPath}/Inputs/${foreignTable.name}Input.cs`
            )

            spinner.stop()
            print.newline()

            spinner.succeed('Created: ' + inputForeignFilePath)

            spinner.start()
          }
        }
      }
    }

    // Create application usecase
    spinner.text = 'Generating usecase...'

    const useCaseFolder = filesystem.path(
      useCasesApplicationFolderPath,
      `${prompResult.usecaseName}`
    )

    if (await filesystem.existsAsync(useCaseFolder)) {
      spinner.fail(
        `Already exists an usecase "${prompResult.usecaseName}UseCase"`
      )
      return
    }

    // Ensure that folder path is created
    await filesystem.dirAsync(useCaseFolder)

    const applicationUsecaseInterfaceFilePath = filesystem.path(
      useCaseFolder,
      `I${prompResult.usecaseName}UseCase.cs`
    )

    const applicationUsecaseFilePath = filesystem.path(
      useCaseFolder,
      `${prompResult.usecaseName}UseCase.cs`
    )

    // Create usecase interface
    await generate({
      template: 'generator/dotnetCore/application/iusecase.ts.ejs',
      target: applicationUsecaseInterfaceFilePath,
      props: {
        usecaseName: prompResult.usecaseName,
        classTable,
        methodType: prompResult.methodType,
        isList,
        projectName: JSON.parse(projectConfig).architecture.name
      }
    })

    // Format usecase interface
    await toolbox.system.run(
      'prettier --print-width 80 --no-semi --single-quote ' +
        ' --trailing-comma --write ' +
        `${applicationFolderPath}/UseCases/${prompResult.usecaseName}/I${prompResult.usecaseName}UseCase.cs`
    )

    // Create usecase
    await generate({
      template: 'generator/dotnetCore/application/usecase.ts.ejs',
      target: applicationUsecaseFilePath,
      props: {
        usecaseName: prompResult.usecaseName,
        repositories: prompResult.selectedRepositories,
        classTable,
        methodType: prompResult.methodType,
        isList,
        projectName: JSON.parse(projectConfig).architecture.name
      }
    })

    // Format usecase
    await toolbox.system.run(
      'prettier --print-width 80 --no-semi --single-quote ' +
        ' --trailing-comma --write ' +
        `${applicationFolderPath}/UseCases/${prompResult.usecaseName}/${prompResult.usecaseName}UseCase.cs`
    )

    spinner.stop()
    print.newline()

    spinner.succeed('Created: ' + applicationUsecaseInterfaceFilePath)
    spinner.succeed('Created: ' + applicationUsecaseFilePath)

    spinner.start()

    const errorCodeConstantPath = filesystem.path(
      webapiFolderPath, 
      'Constants', 
      'ErrorCode.cs'
    );
    
    // Create constants if doesn´t exists
    if(!await filesystem.existsAsync(errorCodeConstantPath)) {
      await generate({
        template: 'generator/dotnetCore/webapi/Constants/ErrorCode.cs.ts.ejs',
        target: errorCodeConstantPath,
        props: {
          projectName: JSON.parse(projectConfig).architecture.name
        }
      })
    }

    const webapiUseCaseFolder = filesystem.path(
      useCasesWebApiFolderPath,
      `${prompResult.usecaseName}`
    )

    // Ensure that folder path is created
    await filesystem.dirAsync(webapiUseCaseFolder)

    const webapiUsecasePresenterFilePath = filesystem.path(
      webapiUseCaseFolder,
      `Presenter.cs`
    )

    const webapiUsecaseControllerFilePath = filesystem.path(
      webapiUseCaseFolder,
      `${classTable.name}Controller.cs`
    )

    // Create usecase presenter
    await generate({
      template: 'generator/dotnetCore/webapi/usecasepresenter.ts.ejs',
      target: webapiUsecasePresenterFilePath,
      props: {
        usecaseName: prompResult.usecaseName,
        methodType: prompResult.methodType,
        isList,
        classTable,
        projectName: JSON.parse(projectConfig).architecture.name
      }
    })

    // Format usecase presenter
    await toolbox.system.run(
      'prettier --print-width 80 --no-semi --single-quote ' +
        ' --trailing-comma --write ' +
        `${webapiFolderPath}/UseCases/${prompResult.usecaseName}/Presenter.cs`
    )

    // Create usecase controller
    await generate({
      template: 'generator/dotnetCore/webapi/usecasecontroller.ts.ejs',
      target: webapiUsecaseControllerFilePath,
      props: {
        usecaseName: prompResult.usecaseName,
        methodType: prompResult.methodType,
        isList,
        classTable,
        route: prompResult.routeName,
        projectName: JSON.parse(projectConfig).architecture.name
      }
    })

    // Format usecase
    await toolbox.system.run(
      'prettier --print-width 80 --no-semi --single-quote ' +
        ' --trailing-comma --write ' +
        `${webapiFolderPath}/UseCases/${prompResult.usecaseName}/${classTable.name}Controller.cs`
    )

    spinner.stop()
    print.newline()

    spinner.succeed('Created: ' + webapiUsecasePresenterFilePath)
    spinner.succeed('Created: ' + webapiUsecaseControllerFilePath)

    spinner.stop()
  }
}
