import { GluegunToolbox, semver } from 'gluegun'
import { ProjectType } from '../enums/projectType'
import { CliProjectConfig } from '../models/cli-project-config'
import * as os from 'os'

module.exports = (toolbox: GluegunToolbox) => {
  const { 
    print, 
    config, 
    filesystem 
  } = toolbox

  toolbox.project = {
    hasValidName,
    nameHasSuffix,
    isInsideDotnetCore,
    checkDependencies
  }

  function hasValidName(name: string): boolean {
    if (!name) {
      return false
    }

    const notAllowedCharacters = /[ !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/

    return notAllowedCharacters.test(name) ? false : true
  }

  function nameHasSuffix(name: string, suffix: string): boolean {
    let length = name.length - suffix.length

    if (!length) {
      return false
    }

    return name.toLowerCase().indexOf(suffix.toLowerCase()) > -1
  }

  async function isInsideDotnetCore() {
    let configFile = await filesystem.readAsync(
      filesystem.path(config.project.configFileName)
    )

    if (!configFile) {
      return false
    }

    configFile = JSON.parse(configFile) as CliProjectConfig

    if (configFile.architecture.type === 'DotnetCore') {
      return configFile
    }

    return false
  }

  async function checkDependencies(projectType: ProjectType) {
    switch (projectType) {
      case ProjectType.angular:
        return _checkAngularDependencies()
      case ProjectType.dotnetCore:
        await _checkElectronDependencies()
        return _checkDotnetCoreDependencies();
      default:
        await _checkDotnetCoreDependencies()
        await _checkElectronDependencies()
        return _checkAngularDependencies()
    }
  }

  async function _checkAngularDependencies() {
    const spinner = print.spin('Checking angular dependencies...')

    try {
      const angularResult = await toolbox.system.run('ng --version', {
        trim: true
      })

      const installedAngularVersion = _getAngularVersionFromResult(
        angularResult
      )

      // if the required version is bigger then the installed one, update the installed version
      if (semver.gt(config.angularCLIVersion, installedAngularVersion)) {
        spinner.text = `Updating angular cli version from @${installedAngularVersion} to @${config.angularCLIVersion}`
        await _installUpdateAngularCli()
      }

      spinner.stop()
      return true
    } catch (e) {
      // Angular Cli not installed
      spinner.text = `Installing @angular/cli@${config.angularCLIVersion}`
      await _installUpdateAngularCli()
      spinner.stop()
      return true
    }
  }

  // Cli depends on electron to promp diagram
  async function _checkElectronDependencies() {
    const spinner = print.spin('Checking cli dependencies...')

    try {
      const electronResult = await toolbox.system.run('electron --version', {
        trim: true
      })

      const installedElectronCLIVersion = electronResult
        .replace('V', '')
        .replace('v', '')

      // if the required version is bigger then the installed one, update the installed version
      if (semver.gt(config.electronCLIVersion, installedElectronCLIVersion)) {
        spinner.text = `Updating electron version from @${installedElectronCLIVersion} to @${config.electronCLIVersion}`
        await _installUpdateElectronCli()
      }

      spinner.stop()
      return true
    } catch (e) {
      // Electron not installed
      spinner.text = `Installing @electron@${config.electronCLIVersion}`
      await _installUpdateElectronCli()
      spinner.stop()
      return false
    }
  }

  // For dotnet core we will always return false if
  // is is not installed, because we can´t get a result
  // when executing a installer file.
  async function _checkDotnetCoreDependencies() {
    const spinner = print.spin('Checking .NET Core dependencies...')

    try {
      const installedDotnetCoreCLIVersion = await toolbox.system.run(
        'dotnet --version',
        {
          trim: true
        }
      )

      // if the required version is bigger then the installed one, update the installed version
      if (
        semver.gt(config.dotnetCoreCLIVersion, installedDotnetCoreCLIVersion)
      ) {
        spinner.text = `Updating .Net Core from @${installedDotnetCoreCLIVersion} to @${config.dotnetCoreCLIVersion}.`
        await _installUpdateDotNetCore()
      }

      spinner.stop()
      return true
    } catch (e) {
      // Dotnet Core not installed
      spinner.text = `Installing .NET Core @${config.dotnetCoreCLIVersion}`
      await _installUpdateDotNetCore()
      spinner.stop()
      return false
    }
  }

  async function _installUpdateAngularCli() {
    await toolbox.system.run(
      `npm install -g @angular/cli@${config.angularCLIVersion}`,
      {
        trim: true
      }
    )
  }

  // Used to promp diagram
  async function _installUpdateElectronCli() {
    await toolbox.system.run(
      `npm install -g electron@${config.electronCLIVersion}`,
      {
        trim: true
      }
    )
  }

  async function _installUpdateDotNetCore() {
    
    try {
      const spinner = print.spin();
      const dotnetTempDir = filesystem.path(
        os.tmpdir(),
        'coffee-installations/dotnetcore'
      )

      // Ensure that the temporary folder is created
      await filesystem.dirAsync(dotnetTempDir)
      
      spinner.start();

      // Windows 64
      if (os.arch() === 'x64') {
        const baseUrl = config.dotnetCoreInstaller.baseUrl;
        const dotnetCoreInstallerUrlx64 = baseUrl + config.dotnetCoreInstaller.downloadUrlx64;
        const pathToSave = filesystem.path(dotnetTempDir, 'dotnet-sdk-3.0.100-win-x64.exe');
        
        spinner.text = "Downloading dotnet sdk 3.0.100....";

        const response = await toolbox.utils.downloadFileToDisk(
          dotnetCoreInstallerUrlx64, 
          pathToSave
        );

        spinner.stop();
        
        if(response.statusCode !== 200) {
          print.info('Failed to download dotnet sdk 3.0.100');
          print.info(`Reason: ${response.statusMessage}.`);
          return;
        }

        print.info('Started installer...');

        await toolbox.system.run(
          `start ${pathToSave}`,
          {
            trim: true
          }
        )

        return true;
      }
      // Windows 32
      else if (os.arch() === 'x32') {
        const baseUrl = config.dotnetCoreInstaller.baseUrl;
        const dotnetCoreInstallerUrlx86 = baseUrl + config.dotnetCoreInstaller.downloadUrlx86;
        const pathToSave = filesystem.path(dotnetTempDir, 'dotnet-sdk-3.0.100-win-x86.exe');
        
        spinner.text = "Downloading dotnet sdk 3.0.100....";

        print.debug(dotnetCoreInstallerUrlx86)
        const response = await toolbox.utils.downloadFileToDisk(
          dotnetCoreInstallerUrlx86, 
          pathToSave
        );

        spinner.stop();
        
        if(response.statusCode !== 200) {
          print.info('Failed to download dotnet sdk 3.0.100');
          print.info(`Reason: ${response.statusMessage}.`);
          return;
        }

        print.info('Started installer...');

        await toolbox.system.run(
          `start ${pathToSave}`,
          {
            trim: true
          }
        )

        return true;
      }
      // Mac os
      else if (process.platform === 'darwin') {
        const baseUrl = config.dotnetCoreInstaller.baseUrl;
        const dotnetCoreInstallerMacOs = baseUrl + config.dotnetCoreInstaller.downloadUrlMacOs;
        const pathToSave = filesystem.path(dotnetTempDir, 'dotnet-sdk-3.0.100-osx-x64');
        
        spinner.text = "Downloading dotnet sdk 3.0.100....";

        const response = await toolbox.utils.downloadFileToDisk(
          dotnetCoreInstallerMacOs, 
          pathToSave
        );

        spinner.stop();

        if(response.statusCode !== 200) {
          print.info('Failed to download dotnet sdk 3.0.100');
          print.info(`Reason: ${response.statusMessage}.`);
          return;
        }
        
        print.info('Started installer...');

        await toolbox.system.run(
          `sudo installer -pkg ${pathToSave}`,
          {
            trim: true
          }
        )

        print.info('Finished installer...');
        return true;
      } 
      else {
        spinner.stop();
        print.info(
          `${print.xmark} Couldn´t install .Net Core ${config.dotnetCoreCLIVersion}.`
        )
        print.info(
          `You can manually install on [https://github.com/dotnet/core/blob/master/release-notes/3.0/3.0.0/3.0.0-download.md]`
        )
        return false;
      }
    } catch (e) {

      print.debug(e);
      print.spin().stop();
      print.info(
        `${print.xmark} Couldn´t install .Net Core ${config.dotnetCoreCLIVersion}.`
      )
      print.info(
        `You can manually install on [https://github.com/dotnet/core/blob/master/release-notes/3.0/3.0.0/3.0.0-download.md]`
      )
      
      return false;
    }
  }

  function _getAngularVersionFromResult(commandVersionResult: string): string {
    const angularVersionKeyword = 'CLI'
    const angularCliVersionIndex = commandVersionResult
      .toLowerCase()
      .indexOf(angularVersionKeyword.toLowerCase())

    let angularVersion = commandVersionResult.substring(
      angularCliVersionIndex + angularVersionKeyword.length,
      angularCliVersionIndex + angularVersionKeyword.length + 7
    )

    // remove special characters except '.' and ',';
    return angularVersion.replace(/[&\/\\#+()$~%'":*?<>{}]/g, '')
  }
}
