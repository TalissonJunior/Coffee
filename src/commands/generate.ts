import { GluegunToolbox } from 'gluegun'

module.exports = {
  name: 'generate',
  alias: ['g'],
  run: async (toolbox: GluegunToolbox) => {
    const {
      print, 
      /*project,
      prompt,*/
      parameters,
      repository 
    } = toolbox
    

    if(parameters.first === 'usecase' || parameters.first === 'u') {

     /* const isInsideDotnetCore = await project.isInsideDotnetCore();
  
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
        
      ]);*/
  
      // use case name
      // controller 
      // route
      // route method type
      // models 
      // repositories
    }
    else if(parameters.first === 'repository' || parameters.first === 'r') {
      await repository.create();
      return;
    }
    else {
      print.info('Command not found.');
      return;
    }

  }
}
