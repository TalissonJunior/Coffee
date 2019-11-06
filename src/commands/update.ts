import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'update',
  alias: ['u'],
  run: async (toolbox: GluegunToolbox) => {
    const {
      dotnetcore,
      print
    } = toolbox

    const spinner = print.spin();
    spinner.start();

    spinner.text = 'Updating project...';

    await dotnetcore.updateEntitiesAndContext();
    await dotnetcore.updateDomains();

    spinner.stop();
    print.newline();
    print.info(`${print.checkmark} Project was successfully updated`);
  }
}
