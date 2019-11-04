const replaceInFile = require('replace-in-file')
const crypto = require('crypto')
import { GluegunToolbox } from 'gluegun'
import { GluegunFileSystemInspectTreeResult } from 'gluegun/build/types/toolbox/filesystem-types'

module.exports = (toolbox: GluegunToolbox) => {
  const { strings, filesystem, plugin } = toolbox

  toolbox.createDotnetCoreProject = createDotnetCoreProject
  toolbox.createAngularProject = createAngularProject

  async function createDotnetCoreProject(name: string) {
    // Used for the project folder name
    let kebabCaseName = name
    // used for project name
    let pascalCaseName = name

    kebabCaseName = strings.kebabCase(kebabCaseName) // 'name-prefix'
    pascalCaseName = strings.pascalCase(pascalCaseName) // 'NamePrefix'

    const templatePath = filesystem.path(
      `${plugin.directory}/templates`,
      'dotnetcore/EmptyProject'
    )
    const temporaryPath = filesystem.path(
      `${plugin.directory}/templates`,
      'generated/EmptyProject'
    )

    // Create a copy of the template to handle replacements
    await filesystem.copyAsync(templatePath, temporaryPath)

    const folderTree = (await filesystem.inspectTreeAsync(temporaryPath, {
      relativePath: true
    })) as GluegunFileSystemInspectTreeResult

    await _handleReplacements(
      folderTree,
      temporaryPath,
      pascalCaseName,
      kebabCaseName,
      true
    )

    await filesystem.copyAsync(
      temporaryPath.replace('EmptyProject', kebabCaseName),
      filesystem.path(kebabCaseName)
    )

    await filesystem.removeAsync(
      temporaryPath.replace('EmptyProject', kebabCaseName)
    )

    // Change appsettings
    await toolbox.template.generate({
      template: 'dotnetcore/EmptyProject/EmptyProject.WebApi/appsettings.json',
      target: `${filesystem.path(
        kebabCaseName
      )}/${pascalCaseName}.WebApi/appsettings.json`,
      props: {
        app: {
          title: pascalCaseName
        },
        jwt: {
          secret: crypto.randomBytes(32).toString('hex'),
          tokenDuration: 7,
          issuer: `webapi.${pascalCaseName}`,
          audience: `webapi.${pascalCaseName.toLowerCase()}.com`,
          passwordResetTokenDuration: 120
        },
        emailSettings: {
          host: 'smtp.kinghost.net',
          email: 'suporte@coffee.com.br',
          password: 'links@525950'
        }
      }
    })

    return filesystem.path(kebabCaseName)
  }

  async function createAngularProject(name: string) {
    // Used for the project folder name
    let kebabCaseName = name
    // used for project name
    let pascalCaseName = name

    kebabCaseName = strings.kebabCase(kebabCaseName) // 'name-prefix'
    pascalCaseName = strings.pascalCase(pascalCaseName) // 'NamePrefix'

    const templatePath = filesystem.path(
      `${plugin.directory}/templates`,
      'angular/EmptyProject'
    )
    const temporaryPath = filesystem.path(
      `${plugin.directory}/templates`,
      'generated/EmptyProject'
    )

    // Create a copy of the template to handle replacements
    await filesystem.copyAsync(templatePath, temporaryPath)

    const folderTree = (await filesystem.inspectTreeAsync(temporaryPath, {
      relativePath: true
    })) as GluegunFileSystemInspectTreeResult

    await _handleReplacements(
      folderTree,
      temporaryPath,
      pascalCaseName,
      kebabCaseName,
      true
    )

    await filesystem.copyAsync(
      temporaryPath.replace('EmptyProject', kebabCaseName),
      filesystem.path(kebabCaseName)
    )

    await filesystem.removeAsync(
      temporaryPath.replace('EmptyProject', kebabCaseName)
    )

    return filesystem.path(kebabCaseName)
  }

  async function _handleReplacements(
    tree: GluegunFileSystemInspectTreeResult,
    parentAbsolutePath: string,
    projectName: string,
    rootFolderName: string,
    isRoot = false
  ) {
    const newProjectName = isRoot ? rootFolderName : projectName
    let absolutePath = filesystem.path(parentAbsolutePath, tree.relativePath)

    if (tree.type === 'file') {
      await replaceInFile({
        files: absolutePath,
        from: /EmptyProject/g,
        to: newProjectName
      })
    }

    tree.name = tree.name.replace('EmptyProject', newProjectName)
    await filesystem.renameAsync(absolutePath, tree.name)

    // Gets the new absolute path
    absolutePath = absolutePath.replace('EmptyProject', newProjectName)

    // map the new tree
    const newTree = (await filesystem.inspectTreeAsync(absolutePath, {
      relativePath: true
    })) as GluegunFileSystemInspectTreeResult

    if (newTree.children) {
      for (let index = 0; index < newTree.children.length; index++) {
        await _handleReplacements(
          newTree.children[index] as any,
          absolutePath,
          projectName,
          rootFolderName,
          false
        )
      }
    }
  }
}
