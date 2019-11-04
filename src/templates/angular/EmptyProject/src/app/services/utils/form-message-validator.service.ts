import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FormMessageValidatorService {
  static getValidatorErrorMessage(validatorName: string) {
    let config = {
      required: 'Campo obrigatório',
      invalidEmailAddress: 'E-mail inválido',
      emailInUse: 'Email já se encontra registrado',
      cpfInUse: 'CPF já se encontra registrado',
      cpjInUse: 'CNPJ já se encontra registrado',
      loginNotRegistered:
        'Não há registro de usuário correspondente a este login. O usuário pode ter sido excluído.',
      invalidPassword: 'Senha inválida',
      minlength: 'Campo inválido',
      invalidCPF: 'CPF inválido',
      invalidCNPJ: 'CNPJ inválido',
      ZipCodeNotFound: 'CEP inválido',
      invalidDate: 'Data Inválida',
      invalidTime: 'Horário inválido',
      invalidPasswordConfirm: 'Senhas diferentes',
      emailNotAvailable: 'Email já cadastrado'
    };

    return config[validatorName];
  }

  static emailValidator(control) {
    // RFC 2822 compliant regex
    if (control.value) {
      if (
        control.value.match(
          /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
        )
      ) {
        return null;
      } else {
        return { invalidEmailAddress: true };
      }
    }

    return null;
  }

  static passwordValidator(control) {
    // {4,100}           - Assert password is between 4 and 100 characters
    // (?=.*[0-9])       - Assert a string has at least one number
    if (control.value.match(/^(?=.*[0-9])[a-zA-Z0-9!@#$%^&.*]{4,100}$/)) {
      return null;
    } else {
      return { invalidPassword: true };
    }
  }

  static dateNumberValidator(control) {
    if (control.value) {
      let dateArray = control.value.split('-');

      if (dateArray != null && dateArray.length == 3) {
        let day = dateArray[0];
        let month = dateArray[1];
        let year = dateArray[2];

        let daysInMonth = new Date(year, month, 0).getDate();

        if (
          month > 0 &&
          month <= 12 &&
          day <= daysInMonth &&
          year.length == 4
        ) {
          return null;
        }

        return { invalidDate: true };
      } else {
        return { invalidDate: true };
      }
    }

    return null;
  }

  static dateNumberValidatorNotDay(control) {
    if (control.value) {
      let dateArray = control.value.split('-');
      if (dateArray != null && dateArray.length == 2) {
        let month = dateArray[0];
        let year = dateArray[1];

        if (month > 0 && month <= 12 && year.length == 4) {
          return null;
        }
        return { invalidDate: true };
      } else {
        return { invalidDate: true };
      }
    }
    return null;
  }

  static timeHourMinuteValidator(control) {
    if (control.value) {
      let time = control.value.split(':');
      if (time != null && time.length == 2) {
        let hours = time[0];
        let minutes = time[1];

        if (hours <= 23 && hours >= 0 && minutes >= 0 && minutes <= 59) {
          return null;
        }
        return { invalidTime: true };
      } else {
        return { invalidTime: true };
      }
    }
    return null;
  }

  static CPFValidator(control) {
    let cpf = control.value;
    if (cpf != null) {
      let arrCpf = cpf.split('');

      arrCpf.forEach((char, i) => {
        if (char === '.' || char === '-') {
          arrCpf[i] = '';
        }
      });

      cpf = arrCpf.join('');
    }

    if (cpf) {
      if (cpf.length != 11) {
        return { invalidCPF: true };
      }
      if (
        cpf == '00000000000' ||
        cpf == '11111111111' ||
        cpf == '22222222222' ||
        cpf == '33333333333' ||
        cpf == '44444444444' ||
        cpf == '55555555555' ||
        cpf == '66666666666' ||
        cpf == '77777777777' ||
        cpf == '88888888888' ||
        cpf == '99999999999'
      ) {
        return { invalidCPF: true };
      }
      let numero: number = 0;
      let caracter: string = '';
      let numeros: string = '0123456789';
      let j: number = 10;
      let somatorio: number = 0;
      let resto: number = 0;
      let digito1: number = 0;
      let digito2: number = 0;
      let cpfAux: string = '';
      cpfAux = cpf.substring(0, 9);
      for (let i: number = 0; i < 9; i++) {
        caracter = cpfAux.charAt(i);
        if (numeros.search(caracter) == -1) {
          return { invalidCPF: true };
        }
        numero = Number(caracter);
        somatorio = somatorio + numero * j;
        j--;
      }
      resto = somatorio % 11;
      digito1 = 11 - resto;
      if (digito1 > 9) {
        digito1 = 0;
      }
      j = 11;
      somatorio = 0;
      cpfAux = cpfAux + digito1;
      for (let i: number = 0; i < 10; i++) {
        caracter = cpfAux.charAt(i);
        numero = Number(caracter);
        somatorio = somatorio + numero * j;
        j--;
      }
      resto = somatorio % 11;
      digito2 = 11 - resto;
      if (digito2 > 9) {
        digito2 = 0;
      }
      cpfAux = cpfAux + digito2;
      if (cpf != cpfAux) {
        return { invalidCPF: true };
      } else {
        return null;
      }
    }

    return null;
  }

  static CNPJValidator(control) {
    let cnpj = control.value;

    if (cnpj) {
      cnpj = cnpj.replace(/[^\d]+/g, '');

      if (cnpj == '') return { invalidCNPJ: true };

      if (cnpj.length != 14) return { invalidCNPJ: true };

      // Elimina CNPJs invalidos conhecidos
      if (
        cnpj == '00000000000000' ||
        cnpj == '11111111111111' ||
        cnpj == '22222222222222' ||
        cnpj == '33333333333333' ||
        cnpj == '44444444444444' ||
        cnpj == '55555555555555' ||
        cnpj == '66666666666666' ||
        cnpj == '77777777777777' ||
        cnpj == '88888888888888' ||
        cnpj == '99999999999999'
      )
        return { invalidCNPJ: true };

      // Valida DVs
      let tamanho = cnpj.length - 2;
      let numeros = cnpj.substring(0, tamanho);
      let digitos = cnpj.substring(tamanho);
      let soma = 0;
      let pos = tamanho - 7;
      for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
      }

      let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
      if (resultado != digitos.charAt(0)) return { invalidCNPJ: true };

      tamanho = tamanho + 1;
      numeros = cnpj.substring(0, tamanho);
      soma = 0;
      pos = tamanho - 7;
      for (let i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2) pos = 9;
      }
      resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
      if (resultado != digitos.charAt(1)) return { invalidCNPJ: true };

      return null;
    }

    return null;
  }
}
