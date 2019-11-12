import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'usecase',
  run: async (toolbox: GluegunToolbox) => {
    const {
      print, 
      project,
      prompt 
    } = toolbox

    const spinner = print.spin();
    spinner.start();

    spinner.text = "Checking project configurations..."

    const isInsideDotnetCore = await project.isInsideDotnetCore();

    if(!isInsideDotnetCore) { 
      spinner.stop();
      return;
    } 
    
    spinner.stop();

    await prompt.ask([
      {
          type: 'input',
          name: 'usaecasename',
          message: 'What is the UseCase name?',
      },
      {
          type: 'input',
          name: 'routename',
          message: 'What is the usecase route name?',
      },
      {
        type: 'radio',
        name: 'methodtype',
        message: 'Select the route method type',
        choices: [
          'GET',
          'PUT',
          'POST',
          'DELETE'
        ],
        default: 'GET'
      },
      
    ]);

    // use case name
    // controller 
    // route
    // route method type
    // models 
    // repositories
    
  }
}
