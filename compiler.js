"use strict";

/*
TODO:
- Make pointers work
- Call function through function pointer
- More advanced local vars
- Fixed point types, preferably adjustable like fp9q7, fp12q4 etc.
*/


// allow fixed point numbers; default is 9q7
const DEFAULT_FIXED_POINT_Q = 7;
var FIXED_POINT_Q = DEFAULT_FIXED_POINT_Q;

//разбивка на токены
function tokenize(s) {
	var tokens = [];
	var thisToken = 0;
	var l;
	var lastDefine;
	var tokenReplace = [
		'ACTOR_X', 0, 'ACTOR_Y', 1, 'ACTOR_SPEEDX', 2, 'ACTOR_SPEEDY', 3, 'ACTOR_HWIDTH', 4, 'ACTOR_HHEIGHT', 5, 
		'ACTOR_ANGLE', 6, 'ACTOR_LIVES', 7, 'ACTOR_REFVAL', 8, 'ACTOR_FLAGS', 9, 'ACTOR_GRAVITY', 10,
		'ACTOR_ON_COLLISION', 11, 'ACTOR_OPTIONS', 14, 'ACTOR_ON_ANIMATE', 13,
		'ACTOR_SPRITE', 15, 'ACTOR_FRAME', 16, 'ACTOR_SW', 17, 'ACTOR_SH', 18,
		'IMG_FLIP_Y', 0x80, 'IMG_FLIP_X', 0x40,
		'KEY_LEFT', 1, 'KEY_RIGHT', 2, 'KEY_UP', 4, 'KEY_DOWN', 8, 
		'KEY_B', 16, 'KEY_A', 32, 'KEY_START', 64, 'KEY_SELECT', 128,
		'BTN_LEFT', 1, 'BTN_RIGHT', 2, 'BTN_UP', 4, 'BTN_DOWN', 8, 
		'BTN_B', 16, 'BTN_A', 32, 'BTN_START', 64, 'BTN_SELECT', 128, 'BTN_ALL', -1,
		'ACTOR_MAP_COLL', 0x8000, 'ACTOR_IN_EVENT', 0x1000, 'ACTOR_Y_EVENT', 0x0C00, 'ACTOR_X_EVENT', 0x0300, 
		'ACTOR_ANIM_EVENT', 0x8000, 'ACTOR_MASK', 0x001F, 
		'ACTOR_T_EVENT', 0x0800, 'ACTOR_B_EVENT', 0x0400, 'ACTOR_L_EVENT', 0x0200, 'ACTOR_R_EVENT', 0x0100,
		'ALL_ACTORS', -1,
		'PARTICLE_SHRINK', 0x10, 'PARTICLE_GRAV', 0x20, 'PARTICLE_FRIC', 0x40, 'PARTICLE_STAR', 0x80,
		'SPRITE_MEMMAP', 0x4000, 'MAP_MEMMAP', 0x5000, 'SCREEN_MEMMAP', 0x6000
		];
	//упрощенный вариант #define, лишь замена
	function define(s) {
		lastDefine = [''];
		while (lastDefine.length != 0) {
			lastDefine = [];
			s = s.replace(/#define\s*([^\s]*)\s*([^\n]*)/, function (str, def, repl, offset, s) {
					lastDefine = [def, repl];
					return ' ';
				});
			if (lastDefine.length > 0) {
				s = s.replace(new RegExp(lastDefine[0], 'g'), lastDefine[1]);
				if (lastDefine[0] == 'FIXED_POINT_Q') {
					var q = Number(lastDefine[1]);
					if (q > 0 && q < 15) {
						FIXED_POINT_Q = q;
					} else {
						info('#define FIXED_POINT_Q requires a value of 1-14, given was:' + lastDefine[1]);
					}
				}
			}
		}
		return s;
	}
	
	// Reset Q
	FIXED_POINT_Q = DEFAULT_FIXED_POINT_Q;
	// Read and replace defines
	s = define(s);
	s = s.replace(/#include[^\n]*/g, ''); // ignore includes
	l = s.length;
	tokens[0] = '';
	for (var i = 0; i < l; i++) {
		switch (s[i]) {
		case '"':
			//обработка строки
			if (tokens[thisToken] != '')
				thisToken++;
			tokens[thisToken] = s[i++];
			while (i < l && s[i] != '"') {
				tokens[thisToken] += s[i++];
				//замена специальных символов
				if (s[i] == '\\' && s[i + 1] == '"') {
					tokens[thisToken] += '\\"';
					i += 2;
				}
			}
			tokens[thisToken] += s[i];
			thisToken++;
			tokens[thisToken] = '';
			break;
		case '\'':
			//обработка отдельных символов
			if (tokens[thisToken] != '')
				thisToken++;
			if (s[i + 2] == '\'') {
				tokens[thisToken] = '' + s.charCodeAt(i + 1);
				thisToken++;
				tokens[thisToken] = '';
				i += 2;
			}
			break;
		case '/':
			//если комментарии, то убираем, оставляя переводы строк
			if (s[i + 1] == '/') {
				while (s[i + 1] != '\n')
					i++;
				break;
			}
			if (s[i + 1] == '*') {
				i += 2;
				while (!(s[i] == '*' && s[i + 1] == '/')) {
					if (s[i] == '\n') {
						if (tokens[thisToken] != '')
							thisToken++;
						tokens[thisToken] = s[i];
						thisToken++;
						tokens[thisToken] = '';
					}
					i++;
					if (i >= l)
						break;
				}
				i++;
				break;
			}
		case '=':
		case '+':
		case '-':
		case '*':
		case '%':
		case '>':
		case '<':
		case '!':
		case '~':
		case '&':
		case '^':
		case '|':
		case '(':
		case ')':
		case '{':
		case '}':
		case '[':
		case ']':
		case ';':
		case '?':
		case ':':
		case ',':
		case '\n':
			if (tokens[thisToken] != '')
				thisToken++;
			tokens[thisToken] = s[i];
			if ((s[i] == '>' || s[i] == '<' || s[i] == '+' || s[i] == '-' || s[i] == '*' || s[i] == '%' || s[i] == '/' || s[i] == '&' || s[i] == '|' || s[i] == '^' || s[i] == '!') && s[i + 1] == '=') {
				i++;
				tokens[thisToken] += s[i];
			}
			else if (s[i] == '-' && s[i + 1] == '>') {
				i++;
				tokens[thisToken] += s[i];
			}
			else if ((s[i] == '>' || s[i] == '<' || s[i] == '&' || s[i] == '|' || s[i] == '+' || s[i] == '-' || s[i] == '=') && s[i] == s[i + 1]) {
				i++;
				tokens[thisToken] += s[i];
			}
			if(!(s[i] == '-' 
					&& (tokens[thisToken - 1] == '=' || tokens[thisToken - 1] == '(' || tokens[thisToken - 1] == ',' || tokens[thisToken - 1] == '>' || tokens[thisToken - 1] == '<') 
					&& s[i + 1] >= '0' && s[i + 1] <= '9')){
				thisToken++;
				tokens[thisToken] = '';
			}
			break;
		case '\t':
		case ' ':
			//убираем лишние пробельные символы
			while (l < i && s[i + 1] == ' ')
				i++;
			if (tokens[thisToken] != '') {
				thisToken++;
				tokens[thisToken] = '';
			}
			break;
		default:
			tokens[thisToken] += s[i];
		}
	}
	for(var i = 0; i < tokens.length; i++){
		var n = tokenReplace.indexOf(tokens[i]);
		if(n > -1 && n % 2 == 0)
			tokens[i] = '' + tokenReplace[n + 1];
	}
		
	return tokens;
}

function compile(t) {
	var asm = []; //основной ассемблерный код
	var dataAsm = []; //ассемблерный код, который будет добавлен в конце основного
	var gameloopAsm = []; //ассемблерный код, который будет добавлен в конце основного
	var thisTokenNumber = 0; //номер текущего токена
	var thisToken; //текущий токен
	var lastToken; //предыдущий токен
	var pointerstar = false;
	var typeTable = new Map();
	var varTable = []; //таблица переменных
	var localVarTable = []; //таблица локальных переменных
	var functionTable = []; //таблица, содержащая имена функций и их исходный код на ассемблере
	var thisFunction = [];
	var isIntoFunction = false; //находимся ли мы в теле функции
	var functionVarTable = []; //таблица переменных, указанных в объявлении текущей обрабатываемой функции
	var lineCount = 0; //номер текущей строки
	var registerCount = 1; //указатель на используемый в данный момент регистор процессора
	var lastEndString = 0; //указатель на токен, являющийся последним в предыдущей строке
	var labelNumber = 0; //номер ссылки, необходим для создания уникальных имен ссылок
	var localStackLength = 0; //используется в функциях для работы с локальными переменными относительно указателя стека
	var switchStack = []; //указывает на последний switch, необходимо для обработки break
        var typeOnStack = []; //type of register on stack

	function putError(line, error, par){
		var er = 'unknown';
		if(language == 'rus')
			switch(error){
				case 0:
					er = "функция " + par + " уже была объявлена";
					break;
				case 1:
					er = "функция " + par + " не соответствует прототипу";
				case 2:
					er = "ожидалось определение типа";
					break;
				case 3:
					er = "ожидалась запятая или закрывающая скобка";
					break;
				case 4:
					er = "ожидалась фигурная открывающая скобка";
					break;
				case 5:
					er = "ожидалась закрывающая скобка в функции " + par;
					break;
				case 6:
					er = "ожидался аргумент в функции " + par;
					break;
				case 7:
					er = "ожидалась открывающая скобка в функции " + par;
					break;
				case 8:
					er = "функция " + par + " не может возвращать значение";
					break;
				case 9:
					er = "работа с локальными массивами не поддерживается";
					break;
				case 10:
					er = "не указана длина массива";
					break;
				case 11:
					er = "неправильное объявление массива";
					break;
				case 12:
					er = "неверное количество аргументов";
					break;
				case 13:
					er = "ожидалась открывающая скобка в конструкции " + par;
					break;
				case 14:
					er = "отсутствует конструкция switch";
					break;
				case 15:
					er = "ожидалось двоеточие";
					break;
				case 16:
					er = "ожидалось число";
					break;
				case 17:
					er = "неподдерживаемое объявление переменных";
					break;
				case 18:
					er = "ожидалась скобка";
					break;
				case 19:
					er = "предупреждение, unsigned не реализовано";
					break;
				case 20:
					er = "неизвестный токен " + par;
					break;
				case 21:
					er = "не найдена точка входа в функцию main";
					break;
			}
		else
			switch(error){
				case 0:
					er = "the "+ par +" function has already been declared";
					break;
				case 1:
					er = "the function "+ par +" does not match the prototype";
				case 2:
					er = "expected type definition";
					break;
				case 3:
					er = "expected comma or closing bracket";
					break;
				case 4:
					er = "expected curly opening bracket";
					break;
				case 5:
					er = "expected closing bracket in function " + par;
					break;
				case 6:
					er = "expected argument in function " + par;
					break;
				case 7:
					er = "expected opening bracket in function " + par;
					break;
				case 8:
					er = "the function "+ par +" cannot return a value";
					break;
				case 9:
					er = "local arrays/variables of type "+par+" is not supported";
					break;
				case 10:
					er = "array length not specified";
					break;
				case 11:
					er = "invalid array declaration";
					break;
				case 12:
					er = "invalid number of arguments "+par;
					break;
				case 13:
					er = "expected opening bracket in construction " + par;
					break;
				case 14:
					er = "no switch design";
					break;
				case 15:
					er = "colon is expected";
					break;
				case 16:
					er = "expected number";
					break;
				case 17:
					er = "unsupported variable declaration";
					break;
				case 18:
					er = "expected brace";
					break;
				case 19:
					er = "warning, unsigned not implemented";
					break;
				case 20:
					er = "unknown token " + par;
					break;
				case 21:
					er = "main function entry point not found";
					break;
				case 22:
					er = "name already used or reserved "+par;
					break;
				case 23:
					er = "invalid name "+par;
					break;
				case 24:
					er = "unexpected token, expected "+par;
					break;
				case 25:
					er = "warning: no casting done "+par;
					break;
			}			
		info("" + line + " " + er);
	}
	//получаем следующий токен, возвращаем false если следующего токена не существует
	function getToken() {
		lastToken = thisToken;
		if (thisTokenNumber < t.length) {
			thisToken = t[thisTokenNumber];
			thisTokenNumber++;
			return true;
		}
		thisToken = false;
		return false;
	}
	//откатываемся к предыдущему токену
	function previousToken() {
		if (thisTokenNumber > 1) {
			thisTokenNumber--;
			thisToken = t[thisTokenNumber - 1];
			if (thisTokenNumber > 1) {
				lastToken = t[thisTokenNumber - 2];
			} else {
				lastToken = '';
			}
			return true;
		} else
			return false;
	}
	//получение ранга операции для правильного порядка выполнения математических операций
	function getRangOperation(t) {
		switch (t) {
		case '=':
		case '+=':
		case '-=':
		case '/=':
		case '%=':
		case '&=':
		case '|=':
		case '^=':
			return 0;
		case '?':
		case ':':
			return 1;
		case '|':
		case '||':
		case '&':
		case '&&':
		case '^':
			return 2;
		case '>':
		case '<':
		case '==':
		case '!=':
		case '<=':
		case '>=':
		case '>>':
		case '<<':
			return 3;
		case '+':
		case '-':
			return 4;
		case '*':
		case '/':
		case '%':
			return 5;
		case '!':
		case '~':
		case '++':
		case '--':
			return 6;
		}
		return -1;
	}

        function typeCast(r1, type1, r2, type2) {
                if (type1 != type2 && (type1 == 'fixed' || type2 == 'fixed')) {
			var r = r1;
			var t = type1;
			if (type1 ==  'fixed') {
				t = type2;
				r = r2;
			}
                        if (t == 'int' || t == 'char') {
                        	asm.push(' MULRES '+FIXED_POINT_Q+',R' + r);
                                typeOnStack[r] = 'fixed';
                	} else if (t == 'actorval' || t == 'void') {
                        	typeOnStack[r] = type;
                        } else {
				// type warning
				putError(lineCount, 25, "cannot cast R"+r+':'+t+'to fixed');
			}
                }
        }

        function typeCastToFirst(r, type) {
		if (typeOnStack[r] == type) return;
		if (typeOnStack[r] == 'fixed' && (type == 'int' || type == 'char')) {
                        asm.push(' CMP R' + r +',0');
			asm.push(' DIVRES '+FIXED_POINT_Q+',R' + r);
                        typeOnStack[r] = 'int';
                } else if ((typeOnStack[r] == 'int' || typeOnStack[r] == 'char') && type == 'fixed') {
                        asm.push(' MULRES '+FIXED_POINT_Q+',R' + r);
                        typeOnStack[r] = 'fixed';
		} else if (typeOnStack[r] == 'char' && type == 'int') {
			typeOnStack[r] = 'int';
		} else if (typeOnStack[r] == 'int' && type == 'char') {
			asm.push(' LDC R15,255 \n AND R'+r+',R15');
			typeOnStack[r] = 'char';
		} else if (typeOnStack[r] == 'actorval' || type == 'actorval') {
			typeOnStack[r] = type;
		} else if (typeOnStack[r] == 'void' || type == 'void') {
			typeOnStack[r] = type;
                } else {
			// type warning
			putError(lineCount, 25, 'cannot cast R'+r+':'+typeOnStack[r]+' to '+type);
		}
        }

	//регистрация функции: имя, тип возвращаемых данных, операнды, объявлена ли функция, исходный код, нужно ли вставлять функцию вместо перехода
	function registerFunction(name, ftype, operands, declar, asm, inline, varLength) {
		var pos = -1;
		for (var i = 0; i < functionTable.length; i++) {
			if (functionTable[i].name == name)
				pos = i;
		}
		if (pos >= 0 && functionTable[pos].declar == 1) {
			putError(lineCount, 0, name);
			//info("" + lineCount + " функция " + name + " уже была объявлена");
		} else if (pos == -1) {
			// имя функции, тип возвращаемых данных, операнды, объявлена ли функция, используется ли функция, код функции, нужно ли вставлять функцию вместо перехода
			functionTable.push({
				name: name,
				type: ftype,
				operands: operands,
				declar: declar,
				use: 0,
				asm: asm,
				inline: inline,
				varLength: varLength
			});
		} else {
			if (!(functionTable[pos].type == ftype)) {
				putError(lineCount, 1, name);
				//info("" + lineCount + " функция " + name + " не соответствует прототипу");
			}
			functionTable[pos].declar = declar;
			functionTable[pos].asm = asm;
			functionTable[pos].varLength = varLength;
		}
	}
	//обработка встреченной в коде функции
	function addFunction(type,isInline) {
		var name = thisToken;
		var start = 0;
		thisFunction[0] = name;
		thisFunction[1] = type;
		localVarTable = [];
		functionVarTable = [];
		registerCount = 1;
		//main вызывается всегда, так что пока что просто ее перепрыгиваем
		if (name == 'main')
			asm.push(' JMP _end_main');
		getToken();
		getToken();
		//добавляем в таблицу переменные функции, сразу тип, затем имя, подряд для упрощения поиска (имя все равно не может соответствовать типу
		while (thisToken != ')') {
			if (isType(thisToken))
				functionVarTable.push(thisToken);
			else {
				putError(lineCount, 2, '');
				//info("" + lineCount + " ожидалось определение типа");
				return false;
			}
			getToken();
			if (!thisToken)
				return;
			if (thisToken == ')' && lastToken == 'void' && functionVarTable.length == 1) {
				functionVarTable = [];
			} else {
				functionVarTable.push(thisToken);
				getToken();
				if (thisToken == '[') {
					getToken();
					getToken();
				}
				if (thisToken == ',')
					getToken();
				else if (thisToken != ')') {
					putError(lineCount, 3, '');
					//info("" + lineCount + " ожидалась запятая или закрывающая скобка");
					return false;
				}
			}
		}
		getToken();
		removeNewLine();
		//if a semicolon follows, then the function body will be described later. Register a function so that you can use it
		if (thisToken == ';') {
			registerFunction(name, type, functionVarTable, 0, [], 0, 0);
		}
		//иначе обрабатываем содержимое функции
		else {
			isIntoFunction = true;
			registerFunction(name, type, functionVarTable, 0, [], 0, 0);
			if (thisToken != '{') {
				putError(lineCount, 4, '');
				//info("" + lineCount + " ожидалась фигурная открывающая скобка");
				return false;
			}
			//запоминаем начала ассемблерного кода, принадлежащего функции
			start = asm.length;
			asm.push('_' + name + ':');
			skipBrace();
			asm.push(' RET');
			//если это main указываем окончание функции
			if (name == 'main') {
				registerFunction(name, type, functionVarTable, 1, [], false, localVarTable.length);
				asm.push('_end_main:');
			}
			//иначе вырезаем весь код функции из таблицы asm и сохраняем в таблицу функций. Это позволит в итоге добавить в финальный код только используемые функции
			else
				registerFunction(name, type, functionVarTable, 1, asm.splice(start, asm.length - start), false, localVarTable.length);
			localVarTable = [];
			isIntoFunction = false;
		}
		thisFunction[0] = '';
		thisFunction[1] = '';
	}
	//вставка кода функции
	function inlineFunction(func) {
		getToken();
		var i = 0;
		if (thisToken != ')') {
			previousToken();
			while (!(thisToken == ')' || thisToken == ';')) {
				getToken();
				if (!thisToken)
					return;
				while (!(thisToken == ',' || thisToken == ')' || thisToken == ';')) {
					execut();
					if (!thisToken)
						return;
					if (getRangOperation(thisToken) > 0)
						execut();
					else if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
						getToken();
				}
				typeCastToFirst(registerCount - 1, func.operands[i * 2]);
				i++;
				if (i > func.operands.length / 2 && !longArg) {
					putError(lineCount, 3, t);
					//info("" + lineCount + " ожидалась закрывающая скобка в функции " + t);
					return false;
				}
			}
		}
		//проверяем соответствие количества аргументов заявленному
		if (i < func.operands.length / 2 && !longArg) {
			putError(lineCount, 6, t);
			//info("" + lineCount + " ожидался аргумент в функции " + t);
			return false;
		}
		asm.push(func.asm.replace(/[Rr]\%(\d)/g, function (str, reg, offset, s) {
				return 'R' + (registerCount - parseNumber(reg));
			}));
		registerCount -= func.operands.length / 2;
		if (func.type != 'void')
			registerCount++;
		getToken();
		if (getRangOperation(thisToken) > 0)
			execut();
		else if (thisToken == ';')
			previousToken();
	}
	//обработка вызова функции
	function callFunction(t) {
		var func;
		var longArg = false;
		var operandsCount = 0;
		var pushOnStack = 0;
		//localStackLength = 0;
		var copyLocalStackLength = localStackLength;
		for (var i = 0; i < functionTable.length; i++) {
			if (functionTable[i].name == t){
				func = functionTable[i];
				break;
			}
		}
		//проверка на неопределенное количество аргументов
		if (func.operands.length > 0 && func.operands[func.operands.length - 1] == '...')
			longArg = true;
		getToken();
		if (thisToken != '(') {
			if(thisToken == ')' || thisToken == ','){
				asm.push(' LDI R' + registerCount + ',_' + func.name);
				func.use++;
				registerCount++;
				return;
			}
			else
				putError(lineCount, 7, t);
				//info("" + lineCount + " ожидалась открывающая скобка в функции " + t);
			return false;
		}
		if (func.inline == 'inline') {
			inlineFunction(func);
			return;
		}
		func.use++;
		i = 0;
		if (registerCount > 1) {
			//если функция должна вернуть значение, то складываем на стек все значения регистров, содержащих данные, дабы функция их не повредила
			if (func.type != 'void') {
				asm.push(' PUSHN R' + (registerCount - 1));
				pushOnStack = registerCount - 1;
				localStackLength += (registerCount - 1);
			} else
				putError(lineCount, 8, func.name);
				//info('' + lineCount + ' функция ' + func.name + ' не может возвращать значение');
		} else
			registerCount++;
		getToken();
		if (thisToken != ')') {
			previousToken();
			while (!(thisToken == ')' || thisToken == ';')) {
				i++;
				getToken();
				if (!thisToken)
					return;
				while (!(thisToken == ',' || thisToken == ')' || thisToken == ';')) {
					execut();
					if (!thisToken)
						return;
					if (getRangOperation(thisToken) > 0)
						execut();
					else if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
						getToken();
				}
				if (!longArg)
					typeCastToFirst(registerCount - 1, func.operands[operandsCount * 2]);
				registerCount--;
				operandsCount++;
				asm.push(' PUSH R' + registerCount);
				localStackLength += 1;
				if (i > func.operands.length / 2 && !longArg) {
					putError(lineCount, 5, t);
					//info("" + lineCount + " ожидалась закрывающая скобка в функции " + t);
					return false;
				}
			}
		}
		//проверяем соответствие количества аргументов заявленному
		if (i < func.operands.length / 2 && !longArg) {
			putError(lineCount, 6, t);
			//info("" + lineCount + " ожидался аргумент в функции " + t);
			return false;
		}
		if (longArg)
			asm.push(' LDC R1,' + (operandsCount * 2));
		//освобождаем место на стеке для переменных
		if(func.varLength == 0 && thisFunction[0] == func.name)
			func.varLength = localVarTable.length;
		if (func.varLength > 0) {
			if (func.varLength < 15)
				asm.push(' DEC R0,' + func.varLength);
			else
				asm.push(' LDC R15,' + func.varLength + '\n SUB R0,R15');
		}
		if (func.inline == 'builtin') asm.push(func.asm); 
		else asm.push(' CALL _' + func.name);
		//функции возвращают значение в первый регистр, переносим в нужный нам
		if (func.type != 'void') {
			if (registerCount != 1) {
				typeOnStack[registerCount] = func.type;
				asm.push(' MOV R' + registerCount + ',R1');
			}
		}
		//восстанавливаем указатель стека
		if ((operandsCount * 2 + func.varLength) > 0xf)
			asm.push(' LDC R15,' + (operandsCount * 2 + func.varLength) + '\n ADD R0,R15');
		else if ((operandsCount * 2 + func.varLength) > 0)
			asm.push(' INC R0,' + (operandsCount * 2 + func.varLength));
		//возвращаем все данные регистров из стека
		if (registerCount > 1) {
			if (pushOnStack > 0)
				asm.push(' POPN R' + pushOnStack);
			localStackLength = 0;
		}
		registerCount++;
		localStackLength = copyLocalStackLength;
		getToken();
		if (getRangOperation(thisToken) > 0)
			execut();
		else if (thisToken == ';')
			previousToken();
	}

	function initTypes() {
		typeTable.set('void',{name: 'void', length: 1, members: []});
		typeTable.set('*void',{name: '*void', length: 1, members: []});
		typeTable.set('int',{name: 'int', length: 1, members: []});
		typeTable.set('*int',{name: '*int', length: 1, members: []});
		typeTable.set('char',{name: 'char', length: 1, members: []});
		typeTable.set('*char',{name: '*char', length: 1, members: []});
		typeTable.set('fixed',{name: 'fixed', length: 1, members: []});
		typeTable.set('*fixed',{name: '*fixed', length: 1, members: []});
		var actormembers = [
		{name: "x", type: 'actorval', length: 1, index: 0},
		{name: "y", type: 'actorval', length: 1, index: 1},
		{name: "dx", type: 'actorval', length: 1, index: 2},
		{name: "dy", type: 'actorval', length: 1, index: 3},
		{name: "hw", type: 'actorval', length: 1, index: 4},
		{name: "hh", type: 'actorval', length: 1, index: 5},
		{name: "angle", type: 'actorval', length: 1, index: 6},
		{name: "lives", type: 'actorval', length: 1, index: 7},
		{name: "refval", type: 'actorval', length: 1, index: 8},
		{name: "flags", type: 'actorval', length: 1, index: 9},
		{name: "gravity", type: 'actorval', length: 1, index: 10},
		{name: "oncollision", type: 'actorval', length: 1, index: 11},
		{name: "onanimate", type: 'actorval', length: 1, index: 13},
		{name: "options", type: 'actorval', length: 1, index: 14},
		{name: "sprite", type: 'actorval', length: 1, index: 15},
		{name: "frame", type: 'actorval', length: 1, index: 16},
		{name: "sw", type: 'actorval', length: 1, index: 17},
		{name: "sh", type: 'actorval', length: 1, index: 18}];
		typeTable.set('actor',{name: 'actor', length: 1, members: actormembers});
	}
	//добавляем новую переменную в таблицу
	function addVar(type,isVolatile) {
		var typedef = typeTable.get(type);
		if (typedef == null) {
			putError(lineCount, 20, type);
			return;
		}
		if (isIntoFunction) {
			if (type == 'actor' || typedef.length != 1) {
				putError(lineCount, 9, type);
			} else {
				localVarTable.push(type);
				localVarTable.push(thisToken);
			}
		} else {
			varTable.push({
				name: thisToken,
				type: typedef.name,
				length: typedef.length,
				index: 0,
				isvol: isVolatile,
				uses: 0
			});
			for(var i = 0; i < typedef.members.length; i++) {
				varTable.push({
					name: thisToken+"."+typedef.members[i].name,
					type: typedef.members[i].type,
					length: typedef.members[i].length,
					isvol: true,
					uses: 0,
					index: typedef.members[i].index
				});
			}
			if (typedef.length == 1) {
				asm.push(' _' + thisToken + ' word ? ');
			} else {
				asm.push(' _' + thisToken + ' word ' + typedef.length + ' dup(?) ');
			}
		}
	}
	//возвращаем тип и имя переменной, если такая существует
	function getVar(t) {
		for (var i = 0; i < varTable.length; i++) {
			if (varTable[i].name == t) {
				varTable[i].uses++;
				return varTable[i];
			}
		}
		return {
			name: 'null',
			type: 'void',
			length: 1,
			isvol: false,
			uses: 0,
			index: 0
		}
	}
	//обрабатываем переменные, данные которых содержатся на стеке
	function localVarToken() {
		var type,l,op;
		var point = pointerstar;
		// if(lastToken == '*' && registerCount == 1)
		// 	point = true;
		var number = functionVarTable.indexOf(thisToken);
		if (number == -1) {
			number = localVarTable.indexOf(thisToken);
			type = localVarTable[number - 1];
			l = localStackLength * 2 + number + 1; //позиция переменной относительно указателя на стек
		} else {
			type = functionVarTable[number - 1];
			//number += localVarTable.length;
			l = localStackLength * 2 + functionVarTable.length + localVarTable.length - number + 1;
		}
		var token = thisToken;
		getToken();
		//если переменная является массивом
		if (thisToken == '[') {
			//вычисление номера ячейки массива
			while (thisToken != ']') {
				getToken();
				if (!thisToken)
					return;
				execut();
			}
			getToken();
			//загрузка ячейки массива
			if (thisToken != '=') {
				previousToken();
				typeCastToFirst(registerCount - 1, 'int');
				if (type == 'char' || type == '*char') {
					if(type == '*char' && !point){
						asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
						asm.push(' LDC R' + (registerCount - 1) + ',(R' + (registerCount + 1) + '+R' + (registerCount - 1) + ')');
					} else
						putError(lineCount, 9, '');
						//info("" + lineCount + " работа с локальными массивами не поддерживается ");
				} else {
					if(type == '*int' && !point){
						asm.push(' LDIAL R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
						asm.push(' LDIAL R' + (registerCount - 1) + ',(R' + (registerCount + 1) + '+R' + (registerCount - 1) + ')');
					} else
						putError(lineCount, 9, '');
						//info("" + lineCount + " работа с локальными массивами не поддерживается ");
				}
				typeOnStack[registerCount - 1] = type;
			}
			//сохранение ячейки массива
			else {
				getToken();
				execut();
				getToken();
				//если за переменной следует математическая операция, то продолжаем трансляцию кода
				if (getRangOperation(thisToken) > 0)
					execut();
				registerCount--;
				typeCastToFirst(registerCount - 1, 'int');
				typeCastToFirst(registerCount, type);
				if (type == 'char' || type == '*char') {
					if(type == '*char' && !point){
						asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
						asm.push(' STC (R' + (registerCount + 1) + '+R' + (registerCount - 1) + '),R' + registerCount);
					} else{
						putError(lineCount, 9, '');
						//info("" + lineCount + " работа с локальными массивами не поддерживается ");
					}
				} else {
					if(type == '*int' && !point){
						//asm.push(' LDC R15,2 \n MUL R' + (registerCount - 1) + ',R15');
						//asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
						asm.push(' LDIAL R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
						asm.push(' STIAL (R' + (registerCount + 1) + '+R' + (registerCount - 1) + '),R' + registerCount);
					} else{
						putError(lineCount, 9, '');
						//info("" + lineCount + " работа с локальными массивами не поддерживается ");
					}
				}
				registerCount--;
			}
		}
		//получить значение переменной
		else if (thisToken != '=' && thisToken != '+=' && thisToken != '-=' && thisToken != '*=' && thisToken != '/=') {
			previousToken();
			if (type == 'char')
				asm.push(' LDC R' + registerCount + ',(' + l + '+R0) ;' + token);
			else
				asm.push(' LDI R' + registerCount + ',(' + l + '+R0) ;' + token);
			typeOnStack[registerCount] = type;
			registerCount++;
		}
		//присвоить значение переменной
		else {
			op = thisToken;
			getToken();
			execut();
			if (getRangOperation(thisToken) > 0)
				execut();
			getToken();
			if (getRangOperation(thisToken) > 0)
				execut();
			registerCount--;
			//---------
			if(op == '+='){
				typeCastToFirst(registerCount, type);
				asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
				asm.push(' ADD R' + registerCount + ',R' + (registerCount + 1));
			}
			else if(op == '-='){
				typeCastToFirst(registerCount, type);
				asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
				asm.push(' SUB R' + (registerCount + 1) + ',R' + registerCount);
				asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
			}
			else if(op == '*='){
				// special if fixed
				asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
				asm.push(' MUL R' + registerCount + ',R' + (registerCount + 1));
				if ((typeOnStack[registerCount] == 'fixed' || typeOnStack[registerCount] == 'actorval') && ((type == 'fixed') || (type == 'actorval'))) {
   	                             asm.push(' LDRES '+FIXED_POINT_Q+',R'+registerCount);
                                }
			}
			else if(op == '/='){
				asm.push(' LDI R' + (registerCount + 1) + ',(' + l + '+R0) ;' + token);
				// special if fixed
				if ((typeOnStack[registerCount] == 'fixed' || typeOnStack[registerCount] == 'actorval') && (type == 'fixed') || (type == 'actorval')) {
					asm.push('MULRES '+FIXED_POINT_Q+',R'+(registerCount + 1)+' \n DIVRES 0,R'+registerCount);
				} else {
					if (type != 'fixed') typeCastToFirst(registerCount, type);
						asm.push(' DIV R' + (registerCount + 1) + ',R' + registerCount);
						asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
				}
			}
			else
				previousToken();
			//---------
			typeCastToFirst(registerCount, type);
			if (type == 'char')
				asm.push(' STC (' + l + '+R0),R' + registerCount + ' ;' + token);
			else
				asm.push(' STI (' + l + '+R0),R' + registerCount + ' ;' + token);
			
		}
	}
	//преобразование строки в формат, понятный ассемблеру, с заменой спецсимволов на их числовой код
	function pushString() {
		var s = '';
		while (thisToken[0] == '"') {
			for (var i = 0; i < thisToken.length; i++) {
				if (thisToken[i] == ';') {
					s += '",59,"';
				} else if (thisToken[i] == '\\') {
					i++;
					if (thisToken[i] == '\\')
						s += '",92,"';
					else if (thisToken[i] == 'n')
						s += '",10,"';
					else if (thisToken[i] == 't')
						s += '",9,"';
					else if (thisToken[i] == '"')
						s += '",34,"';
				} else
					s += thisToken[i];
			}
			getToken();
			removeNewLine();
			s += ',';
		}
		previousToken();
		//dataAsm вставляется в таблицу asm после завершения компиляции
		dataAsm.push('DB ' + s + '0');
	}
	//добавляем массив
	function addArray(type) {
		var name = lastToken;
		var length = 1;
		var buf = '';
		getToken();
		//количество элементов не указано
		if (thisToken == ']') {
			getToken();
			if (thisToken != '=')
				putError(lineCount, 10, '');
				//info("" + lineCount + " не указана длина массива");
			else
				getToken();
			//массив это строка символов
			if (thisToken[0] == '"') {
				length = thisToken.length - 2;
				dataAsm.push('_' + name + ':');
				pushString();
				varTable.push({
					name: name,
					type: type,
					length: length,
					isvol: true,
					index: 0,
					uses: 0
				});
			}
			//массив уже заполнен, считаем количество элементов
			else if (thisToken == '{') {
				while (thisToken && thisToken != '}') {
					getToken();
					removeNewLine();
					if (!thisToken)
						return;
					if (isNumber(thisToken))
						buf += parseNumber(thisToken) + ',';
					else if(isVar(thisToken))
						buf += '_' + thisToken + ',';
					else
						buf += '0,';
					length++;
					getToken();
					removeNewLine();
					if (!(thisToken == '}' || thisToken == ','))
						putError(lineCount, 11, '');
						//info("" + lineCount + " неправильное объявление массива");
				}
				if (type == 'int')
					dataAsm.push('_' + name + ': \n DW ' + buf.substring(0, buf.length - 1));
				else if (type == 'char')
					dataAsm.push('_' + name + ': \n DB ' + buf.substring(0, buf.length - 1));
				else dataAsm.push('_' + name + ': \n DW ' + parseInt(buf.substring(0, buf.length - 1))*typeTable.get(type).length );
				varTable.push({
					name: name,
					type: type,
					length: length,
					isvol: true,
					index: 0,
					uses: 0
				});
			}
		}
		//количество элементов указано
		else if (isNumber(thisToken)) {
			length = thisToken * 1;
			var newArr = '';
			if (type == 'char')
				newArr = (' _' + name + ' byte ' + length + ' dup(?)');
			else
				newArr = (' _' + name + ' word ' + length*typeTable.get(type).length + ' dup(?)');
			varTable.push({
				name: name,
				type: type,
				length: length,
				isvol: true,
				index: 0,
				uses: 0
			});
			getToken();
			if (thisToken != ']')
				putError(lineCount, 11, '');
				//info("" + lineCount + " неправильное объявление массива");
			getToken();
			if(thisToken == '='){
				getToken();
				if (thisToken != '{')
					putError(lineCount, 11, '');
				var nlength = 1;
				while (thisToken && thisToken != '}') {
					getToken();
					removeNewLine();
					if (!thisToken)
						return;
					if(isNumber(thisToken))
						buf += parseNumber(thisToken) + ',';
					else if(isVar(thisToken))
						buf += '_' + thisToken + ',';
					else
						buf += '0,';
					nlength++;
					getToken();
					removeNewLine();
					if (!(thisToken == '}' || thisToken == ','))
						putError(lineCount, 11, '');
						//info("" + lineCount + " неправильное объявление массива");
				}
				if (type == 'int')
					newArr = ('_' + name + ': \n DW ' + buf.substring(0, buf.length - 1))*1*typeTable.get(type).length;
				else if (type == 'char')
					newArr = ('_' + name + ': \n DB ' + buf.substring(0, buf.length - 1))*1*typeTable.get(type).length;
				if(nlength < length){
					console.log(nlength);
					for(var i = nlength; i <= length; i++)
						newArr += ',0';
				}
				else length = nlength;
				varTable.push({
					name: name,
					type: type,
					length: length,
					isvol: true,
					index: 0,
					uses: 0
				});
			}
			dataAsm.push(newArr);
		} else
			putError(lineCount, 11, '');
			//info("" + lineCount + " неправильное объявление массива");
	}
	//проверка, является ли токен t функцией
	function isFunction(t) {
		for (var i = 0; i < functionTable.length; i++) {
			if (functionTable[i].name == t)
				return true;
		}
		return false;
	}
	//проверка, является ли токен t переменной
	function isVar(t) {
		for (var i = 0; i < varTable.length; i++) {
			if (varTable[i].name == t)
				return true;
		}
		return false;
	}

	function isReserved(t) {
		return (t.match(/auto|break|byte|case|char|const|continue|default|do|double|else|enum|extern|false|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|true|typedef|union|unsigned|void|volatile|while/) !== null);
	}

	function isValidName(t) {
		return ((t.match(/[a-zA-Z][a-zA-Z0-9_]*/) !== null) && !isReserved(t));
	} 

	function isUsedName(t) {
		return (isNumber(t) || isVar(t) || isType(t) || isTypeDef(t) || isFunction(t));
	}

	function isTypeDef(t) {
		if (t == 'struct')
			return true;
		return false;
	}
	
	function isType(t) {
		if (typeTable.has(t))
			return true;
		return false;
	}

	//проверка, является ли токен t числом
	function isNumber(t) {
		return !isNaN(Number(t)); //  && isFinite(t);
	}

	function isFloat(t) {
		return (isNumber(t) && (t.indexOf('.') != -1));
	}

	// number parser, with fraction to fixed point conversion
	function parseNumber(t) {
		if (t.indexOf('.') != -1) {
		// contains . -> fraction
			return Math.round(parseFloat(t)*(1 << FIXED_POINT_Q));
		}
		return Number(t); // parseInt(t);
	}

	function getStructMember(s,m) {
		var typedef = typeTable.get(s);
		if (typedef !== null) {
			for (var i = 0; i < typedef.members.length; i++) {
				if (typedef.members[i].name == m) {
					return typedef.members[i];
				}
			}
		}
		return null;
	}
	//обрабатываем переменную
	function varToken() {
		var v = getVar(thisToken);
		var point = pointerstar;
		var op;
		var thisLine = lineCount;
		//if(lastToken == '*' && registerCount == 1)
		//	point = true;
		getToken();
		//если переменная является массивом
		if (thisToken == '[') {
			var atype = typeTable.get(v.type);
			var vtype = typeTable.get(v.type);
			var vindex = '';
			//вычисление номера ячейки массива
			getToken();
			while (thisToken != ']') {
				if (!thisToken){
					putError(thisLine, 18, '');
					return;
				}
				execut();
				if (getRangOperation(thisToken) == -1  && thisToken != ']'){
					getToken();
					execut();
				}
			}
			getToken();
			if (thisToken.startsWith('.')) {
				var mname = thisToken.substring(1);
				var tmember; // = getStructMember(v.type, mname);
				if (v.type.startsWith('*')) {
					tmember = getStructMember(v.type.substring(1), mname);
				} else {
					tmember = getStructMember(v.type, mname);
				}

				if (tmember === null) {
					putError(lineCount, 20, mname);
					return;
				}

				vindex = tmember.index;
				vindex = (vindex > 0 && v.type != 'actorval') ? '.' + (vindex*2) : '';
				// {name: "x", type: 'actorval', length: 1, index: 0},
				vtype = typeTable.get(tmember.type);
				// struct member value
				// get member type and index
				getToken();
			}
			//загрузка ячейки массива
			if (thisToken != '=' && thisToken != '+=' && thisToken != '-=' && thisToken != '*=' && thisToken != '/=') {
				typeCastToFirst(registerCount - 1, 'int');
				previousToken();
				if (v.type == 'char' || v.type == '*char') {
					if(v.type == '*char' && !point){
						asm.push(' LDI R' + registerCount + ',(_' + v.name +')');
						asm.push(' LDC R' + (registerCount - 1) + ',(R' + registerCount + '+R' + (registerCount - 1) + ')');
					} else
						asm.push(' LDC R' + (registerCount - 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
				} else {
					if(v.type.startsWith('*') && !point){
						//asm.push(' LDC R15,2 \n MUL R' + (registerCount - 1) + ',R15');
						asm.push(' LDI R' + registerCount + ',(_' + v.name +')');
						if (vindex !== '') asm.push(' INC R' + registerCount + ','+vindex.substring(1));
						asm.push(' LDIAL R' + (registerCount - 1) + ',(R' + registerCount + '+R' + (registerCount - 1) + ')');
					} else {
						if (atype.length > 1) {
							asm.push(' LDC R15,'+atype.length);
							asm.push(' MUL R' + (registerCount - 1) + ',R15');
						}
						/*if (vindex > 15) {
							asm.push(' LDC R15,'+vindex);
							asm.push(' ADD R' + (registerCount - 1) + ',R15');
						} else if (vindex > 0) {
							asm.push(' INC R' + (registerCount - 1) + ','+vindex);
						} */
						asm.push(' LDIAL R' + (registerCount - 1) + ',(_' + v.name + vindex + '+R' + (registerCount - 1) + ')');
					}
				}
				typeOnStack[registerCount - 1] = v.type;
			}
			//сохранение ячейки массива
			else {
				op = thisToken;
				getToken();
				execut();
				getToken();
				//если за переменной следует математическая операция, то продолжаем трансляцию кода
				if (getRangOperation(thisToken) > 0)
					execut();
				registerCount--;
				typeCastToFirst(registerCount - 1, 'int');
				if (v.type == 'char' || v.type == '*char') {
					if(v.type == '*char' && !point){
						asm.push(' LDI R' + (registerCount + 1) + ',(_' + v.name +')');
						asm.push(' STC (R' + (registerCount + 1) + '+R' + (registerCount - 1) + '),R' + registerCount);
					} else{
						typeCastToFirst(registerCount, v.type);
						if(op == '+='){
							asm.push(' LDC R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' ADD R' + registerCount + ',R' + (registerCount + 1));
						}
						else if(op == '-='){
							asm.push(' LDC R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' SUB R' + (registerCount + 1) + ',R' + registerCount);
							asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
						}
						else if(op == '*='){
							asm.push(' LDC R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' MUL R' + registerCount + ',R' + (registerCount + 1));
						}
						else if(op == '/='){
							asm.push(' LDC R' + (registerCount + 1) + ',(_' + v.name + '+R' + (registerCount - 1) + ')');
							asm.push(' DIV R' + (registerCount + 1) + ',R' + registerCount);
							asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
						}
						asm.push(' STC (_' + v.name + '+R' + (registerCount - 1) + '),R' + registerCount);
					}
				} else {
					if(v.type.startsWith('*') && !point){
						asm.push(' LDI R' + (registerCount + 1) + ',(_' + v.name +')');
						if (vindex !== '') asm.push(' INC R' + (registerCount + 1) + ','+vindex.substring(1));
						asm.push(' STIAL (R' + (registerCount + 1) + '+R' + (registerCount - 1) + '),R' + registerCount);
					} else{
						if (atype.length > 1) {
							asm.push(' LDC R15,'+atype.length);
							asm.push(' MUL R' + (registerCount - 1) + ',R15');
						} 
						if (op != '=') {
							asm.push(' LDIAL R' + (registerCount + 1) + ',(_' + v.name + vindex + '+R' + (registerCount - 1) + ')');
							if(op == '+='){
								typeCastToFirst(registerCount, v.type);
								asm.push(' ADD R' + registerCount + ',R' + (registerCount + 1));
							}
							else if(op == '-='){
								typeCastToFirst(registerCount, v.type);
								asm.push(' SUB R' + (registerCount + 1) + ',R' + registerCount);
								asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
							}
							else if(op == '*='){
								asm.push(' MUL R' + registerCount + ',R' + (registerCount + 1));
								if ((typeOnStack[registerCount] == 'fixed' || typeOnStack[registerCount] == 'actorval') && ((v.type == 'fixed') || (v.type == 'actorval'))) {
                                        				asm.push(' LDRES '+FIXED_POINT_Q+',R'+registerCount);
								}
								if (v.type != 'fixed') typeCastToFirst(registerCount, v.type);
							}
							else if(op == '/='){
				                                if ((typeOnStack[registerCount] == 'fixed' || typeOnStack[registerCount] == 'actorval') && (v.type == 'fixed') || (v.type == 'actorval')) {
				                                        asm.push('MULRES '+FIXED_POINT_Q+',R'+(registerCount + 1)+' \n DIVRES 0,R'+registerCount);
                                				} else {
                                        				if (v.type != 'fixed') typeCastToFirst(registerCount, v.type);
                                        				asm.push(' DIV R' + (registerCount + 1) + ',R' + registerCount);
                                        				asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
                                				}
							}
						}
						typeCastToFirst(registerCount, v.type);
						asm.push(' STIAL (_' + v.name + vindex + '+R' + (registerCount - 1) + '),R' + registerCount);
					}
				}
				registerCount--;
			}
		}
		//загрузка значения переменной
		else if (thisToken != '=' && thisToken != '+=' && thisToken != '-=' && thisToken != '*=' && thisToken != '/=') {
			previousToken();
			var vnames = v.name.split('.');
			var vindex = (v.index > 0 && v.type != 'actorval') ? '.' + (v.index*2) : '';
			var vlabel = v.name;
			if (vnames.length > 1) {
				vlabel = vnames[0];
			}
			if (v.type == 'actorval') {
				asm.push(' LDI R' + registerCount + ',(_' + vlabel +')');
				asm.push(' LDC R15,'+v.index);
				asm.push(' ACTGET R' + registerCount + ',R15');
			} else if (v.length > 1) {
                                asm.push(' LDI R' + registerCount + ',_' + vlabel);
			} else if (v.type == 'char' || v.type == '*char') {
				asm.push(' LDC R' + registerCount + ',(_' + vlabel + ')');
			} else {
				asm.push(' LDI R' + registerCount + ',(_' + vlabel + vindex + ')');
			}
			typeOnStack[registerCount] = v.type;
			registerCount++;
		}
		//присваивание значения переменной
		else
			assigment();
	}
	//обработка возврата из функции
	function returnToken() {
		if (!isIntoFunction) {
			putError(lineCount, 20, 'return outside function not allowed!');
			return;
		}
		getToken();
		if (thisToken == ';') {
			if (thisFunction[1] != 'void') putError(lineCount, 12, 'return value expected');
			asm.push(' RET ');
			return;
		} else if (thisFunction[1] == 'void') {
			putError(lineCount, 8, thisFunction[0]);
			asm.push(' RET ');
			return;
		}
		if (thisToken != '(') {
			putError(lineCount, 20, 'return of value requires braces');
			asm.push(' RET ');
			return;
		}
		registerCount = 2;
		while (thisToken != ';') {
			getToken();
			if (!thisToken)
				return;
			execut();
		}
		registerCount--;
		typeCastToFirst(registerCount,thisFunction[1]);
		asm.push(' MOV R1,R' + registerCount);
		registerCount--;
		if (registerCount > 1) {
			putError(lineCount, 12, '');
			//info("" + lineCount + " неверное количество аргументов");
		}
		registerCount == 1;
		asm.push(' RET ');
	}
	//присваивание значения переменной
	function assigment() {
		var variable = lastToken;
		var v = getVar(variable);
		var op = thisToken;
		registerCount = 2;
		if (localVarTable.indexOf(variable) > -1) {
			previousToken();
			localVarToken();
		} else {
			var point = pointerstar;
			getToken();
			execut();
			if (getRangOperation(thisToken) > 0)
				execut();
			getToken();
			if (getRangOperation(thisToken) > 0)
				execut();
			registerCount--;
			// var point = (lastToken == '*' && registerCount == 1);
			var vnames = v.name.split('.');
			var vlabel = v.name;
			var vindex = (v.index > 0 && v.type != 'actorval') ? '.' + (v.index*2) : '';
                        if (vnames.length > 1) {
                                vlabel = vnames[0];
                        }
			// typeOnStack[registerCount + 1] = v.type;
			if (op != '=') {
				asm.push(' LDI R' + (registerCount + 1) + ',(_' + vlabel + vindex + ')');
				if(v.type == '*int' && point){
					asm.push(' MOV R' + (registerCount + 2) + ',R' + (registerCount + 1));
					asm.push(' LDI R' + (registerCount + 1) + ',(R' + (registerCount + 2) + ')');
				} else if (v.type == 'actorval') {
                                	asm.push(' LDC R15,'+v.index);
					asm.push(' ACTGET R' + (registerCount + 1) + ',R15');
				}
			}
			
			if(op == '+='){
				typeCastToFirst(registerCount, v.type);
				asm.push(' ADD R' + registerCount + ',R' + (registerCount + 1));
			}
			else if(op == '-='){
				typeCastToFirst(registerCount, v.type);
				asm.push(' SUB R' + (registerCount + 1) + ',R' + registerCount);
				asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
			}
			else if(op == '*='){
				asm.push(' MUL R' + registerCount + ',R' + (registerCount + 1));
				// if both are fixed then use special mul
				if ((typeOnStack[registerCount] == 'fixed' || typeOnStack[registerCount] == 'actorval') &&
					((v.type == 'fixed') || (v.type == 'actorval'))) {
                                        	asm.push(' LDRES '+FIXED_POINT_Q+',R'+registerCount);
				}
				if (v.type != 'fixed') typeCastToFirst(registerCount, v.type);
			}
			else if(op == '/='){
				// if divider is fixed then use special div
                        	if ((typeOnStack[registerCount] == 'fixed' || typeOnStack[registerCount] == 'actorval') && 
					(v.type == 'fixed') || (v.type == 'actorval')) {
                                	asm.push('MULRES '+FIXED_POINT_Q+',R'+(registerCount + 1)+' \n DIVRES 0,R'+registerCount);
				} else {
					if (v.type != 'fixed') typeCastToFirst(registerCount, v.type);
                                	asm.push(' DIV R' + (registerCount + 1) + ',R' + registerCount);
					asm.push(' MOV R' + registerCount + ',R' + (registerCount + 1));
				}
			}
			if (v.type == '*int' && point) {
				typeCastToFirst(registerCount, 'int');
				if (op == '=') {
					asm.push(' LDI R' + (registerCount + 1) + ',(_' + vlabel + vindex + ')');
					asm.push(' STI (R' + (registerCount + 1) + '),R' + registerCount);
				} else {
					asm.push(' STI (R' + (registerCount + 2) + '),R' + registerCount);
				}
			} else 	if (v.type == 'actorval') {
                                asm.push(' LDC R15,'+v.index);
				asm.push(' LDI R' + (registerCount + 1) + ',(_' + vlabel + ')');
                                asm.push(' ACTSET R' + (registerCount + 1) + ',R15,R' + registerCount);
			} else {
				typeCastToFirst(registerCount, v.type);
				asm.push(' STI (_' + vlabel + vindex + '),R' + registerCount);
			}
			previousToken();
		}
	}
	//обработка сложения/вычитания/декремента/инкремента
	function addSub() {
		var variable = lastToken;
		//если инкремент
		if (thisToken == '++') {
			//если инкремент следует за переменной (var++)
			if (isVar(variable) || localVarTable.indexOf(variable) > -1 || functionVarTable.indexOf(variable) > -1) {
				if (localVarTable.indexOf(variable) > -1) {
					if (registerCount == 1) {
						asm.push(' LDI R' + registerCount + ',(' + (localStackLength * 2 + localVarTable.indexOf(variable) + 1) + '+R0)');
						registerCount++;
					}
					asm.push(' MOV R' + registerCount + ',R' + (registerCount - 1));
					asm.push(' INC R' + registerCount);
					asm.push(' STI (' + (localStackLength * 2 + localVarTable.indexOf(variable) + 1) + '+R0),R' + registerCount);
				}
				else if (isVar(variable))
					asm.push(' INC _' + variable);
			}
			//если переменная следует за инкрементом (++var)
			else {
				getToken();
				if (localVarTable.indexOf(thisToken) > -1) {
					asm.push(' LDI R' + registerCount + ',(' + (localStackLength * 2 + localVarTable.indexOf(thisToken) + 1) + '+R0)');
					asm.push(' INC R' + registerCount);
					asm.push(' STI (' + (localStackLength * 2 + localVarTable.indexOf(thisToken) + 1) + '+R0),R' + registerCount);
					registerCount++;
				}
				else if (isVar(thisToken)) {
					asm.push(' INC _' + thisToken);
					execut();
				} 
			}
			getToken();
		}
		//если декремент
		else if (thisToken == '--') {
			if (isVar(variable) || localVarTable.indexOf(variable) > -1 || functionVarTable.indexOf(variable) > -1) {
				if (localVarTable.indexOf(variable) > -1) {
					if (registerCount == 1) {
						asm.push(' LDI R' + registerCount + ',(' + (localStackLength * 2 + localVarTable.indexOf(variable) + 1) + '+R0)');
						registerCount++;
					}
					asm.push(' MOV R' + registerCount + ',R' + (registerCount - 1));
					asm.push(' DEC R' + registerCount);
					asm.push(' STI (' + (localStackLength * 2 + localVarTable.indexOf(variable) + 1) + '+R0),R' + registerCount);
				}
				else if (isVar(variable))
					asm.push(' DEC _' + variable);
			} else {
				getToken();
				if (localVarTable.indexOf(thisToken) > -1) {
					asm.push(' LDI R' + registerCount + ',(' + (localStackLength * 2 + localVarTable.indexOf(thisToken) + 1) + '+R0)');
					asm.push(' DEC R' + registerCount);
					asm.push(' STI (' + (localStackLength * 2 + localVarTable.indexOf(thisToken) + 1) + '+R0),R' + registerCount);
					registerCount++;
				}
				else if (isVar(thisToken)) {
					asm.push(' DEC _' + thisToken);
					execut();
				} 
			}
			getToken();
		} else {
			var operation = thisToken;
			getToken();
			execut();
			if (getRangOperation(thisToken) == -1)
				if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
					getToken();
			//если следующая операция выше рангом, то выполняем сразу ее
			if (getRangOperation(thisToken) > 4)
				execut();
			registerCount--;
			typeCast(registerCount - 1, typeOnStack[registerCount - 1], registerCount, typeOnStack[registerCount]);
			if (operation == '+')
				asm.push(' ADD R' + (registerCount - 1) + ',R' + registerCount);
			else if (operation == '-')
				asm.push(' SUB R' + (registerCount - 1) + ',R' + registerCount);
			if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
				execut();
		}
	}
	//деление, умножение, остаток
	function divMul() {
		var operation = thisToken;
		getToken();
		execut();
		if (getRangOperation(thisToken) == -1)
			if (!(thisToken == ',' || thisToken == ')' || thisToken == ';' || thisToken == '?'))
				getToken();
		//если следующая операция выше рангом, то выполняем сразу ее
		if (getRangOperation(thisToken) > 5)
			execut();
		registerCount--;

		if (operation == '*') {
			asm.push(' MUL R' + (registerCount - 1) + ',R' + registerCount);
			if (typeOnStack[registerCount - 1] == 'fixed') {
				if ((typeOnStack[registerCount] == 'fixed') || (typeOnStack[registerCount] == 'actorval'))
					asm.push(' LDRES '+FIXED_POINT_Q+',R'+(registerCount -1)); 
				// else if ((typeOnStack[registerCount] != 'int') && (typeOnStack[registerCount] != 'char'))
				// 	putError(lineCount, 25,'multiplying fixed with '+typeOnStack[registerCount]);
			} //else if (typeOnStack[registerCount] ==  'fixed') {
			//	putError(lineCount, 25,'multiplying '+typeOnStack[registerCount-1]+' with fixed');
			// }
			if (typeOnStack[registerCount] == 'fixed') typeOnStack[registerCount - 1] = 'fixed'; 
		} else if (operation == '/') {
			if (typeOnStack[registerCount] == 'fixed') typeCastToFirst(registerCount - 1, 'fixed');
			if ((typeOnStack[registerCount - 1] == 'fixed') && (typeOnStack[registerCount] == 'fixed'))
				asm.push('MULRES '+FIXED_POINT_Q+',R'+(registerCount - 1)+' \n MOV R'+(registerCount -1)+',R'+registerCount+'\n DIVRES 0,R'+(registerCount - 1));
			else 
				asm.push(' DIV R' + (registerCount - 1) + ',R' + registerCount);
		} else if (operation == '%') {
			typeCastToFirst((registerCount - 1), 'int');
			typeCastToFirst(registerCount, 'int');
			asm.push(' DIV R' + (registerCount - 1) + ',R' + registerCount + ' \n MOV R' + (registerCount - 1) + ',R' + registerCount);
		}
		if (!(thisToken == ',' || thisToken == ')' || thisToken == ';' || thisToken == '?'))
			execut();
	}
	// & | ^
	function andOrXor() {
		var operation = thisToken;
		getToken();
	/*	if (thisToken == operation) {
			operation += thisToken;
			getToken();
		}*/
		execut();
		if (getRangOperation(thisToken) == -1)
			if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
				getToken();
		//если следующая операция выше рангом, то выполняем сразу ее
		if (getRangOperation(thisToken) > 2)
			execut();
		if(operation.length > 1)
			execut();
		registerCount--;
		if (operation == '&')
			asm.push(' AND R' + (registerCount - 1) + ',R' + registerCount);
		else if (operation == '|')
			asm.push(' OR R' + (registerCount - 1) + ',R' + registerCount);
		if (operation == '&&')
			asm.push(' ANDL R' + (registerCount - 1) + ',R' + registerCount);
		else if (operation == '||')
			asm.push(' ORL R' + (registerCount - 1) + ',R' + registerCount);
		else if (operation == '^')
			asm.push(' XOR R' + (registerCount - 1) + ',R' + registerCount);
		if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
			execut();
	}
	//сравнение
	function compare() {
		var operation = thisToken;
		getToken();
		//если следующий токен операция, то это могут быть ==, <=, >=, !=
		if (getRangOperation(thisToken) == 3) {
			operation += thisToken;
			getToken();
		}
		execut();
		getToken();
		if (getRangOperation(thisToken) > 3)
			execut();
		else
			previousToken();
		registerCount--;

		if (operation == '>=') {
			typeCast(registerCount - 1, typeOnStack[registerCount - 1], registerCount, typeOnStack[registerCount]);
			asm.push(' CMP R' + registerCount + ',R' + (registerCount - 1));
			asm.push(' LDF R' + (registerCount - 1) + ',4');
		} else if (operation == '>>') {
			typeCastToFirst(registerCount, 'int');
			asm.push(' SHR R' + (registerCount - 1) + ',R' + registerCount);
		} else if (operation == '<<') {
			typeCastToFirst(registerCount, 'int');
			asm.push(' SHL R' + (registerCount - 1) + ',R' + registerCount);
		} else {
			typeCast(registerCount - 1, typeOnStack[registerCount - 1], registerCount, typeOnStack[registerCount]);
			asm.push(' CMP R' + (registerCount - 1) + ',R' + registerCount);
			if (operation == '<=') 
				asm.push(' LDF R' + (registerCount - 1) + ',4');
			else if (operation == '>')
				asm.push(' LDF R' + (registerCount - 1) + ',3');
			else if (operation == '<')
				asm.push(' LDF R' + (registerCount - 1) + ',2');
			else if (operation == '==')
				asm.push(' LDF R' + (registerCount - 1) + ',1');
			else if (operation == '!=')
				asm.push(' LDF R' + (registerCount - 1) + ',5');
			else		
				return false;
		}
		if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
			getToken();
		if (!(thisToken == ',' || thisToken == ')' || thisToken == ';'))
			execut();
	}
	//обработка условных ветвлений
	function ifToken() {
		//labe делает ссылки уникальными
		var labe = labelNumber;
		labelNumber++;
		getToken();
		if (thisToken != '(')
			putError(lineCount, 13, 'if');
			//info("" + lineCount + " ожидалась открывающая скобка в конструкции if");
		skipBracket();
		removeNewLine();
		registerCount--;
		asm.push(' CMP R' + registerCount + ',0');
		asm.push(' JZ end_if_' + labe);
		getToken();
		removeNewLine();
		//если открывающая фигурная скобка пропускаем блок этих скобок
		if (thisToken == '{') {
			skipBrace();
		}
		//иначе просто выполняем до конца строки
		else {
			execut();
			if(isVar(thisToken)){
				getToken();
				execut();
			}
			if(thisToken == ')')
				getToken();
		}
		registerCount = 1;
		getToken();
		removeNewLine();
		//обработка else
		if (thisToken == 'else') {
			asm.push('JMP end_else_' + labe);
			asm.push('end_if_' + labe + ':');
			getToken();
			execut();
			asm.push('end_else_' + labe + ':');
		} else {
			asm.push('end_if_' + labe + ':');
			previousToken();
		}
	}

	function whileToken() {
		var labe = labelNumber;
		labelNumber++;
		getToken();
		if (thisToken != '(')
			putError(lineCount, 13, 'while');
			//info("" + lineCount + " ожидалась открывающая скобка в конструкции while");
		asm.push('start_while_' + labe + ':');
		skipBracket();
		registerCount--;
		asm.push(' CMP R' + registerCount + ',0');
		asm.push(' JZ end_while_' + labe);
		getToken();
		removeNewLine();
		if (thisToken == '{') {
			skipBrace();
		}
		else {
			execut();
			if(isVar(thisToken)){
				getToken();
				execut();
			}
			if(thisToken == ')')
				getToken();
		}
		registerCount = 1;
		getToken();
		removeNewLine();
		asm.push(' JMP start_while_' + labe + ' \nend_while_' + labe + ':');
		previousToken();
	}

	function forToken() {
		var labe = labelNumber;
		var startToken;
		var memToken;
		var bracketCount = 0;
		labelNumber++;
		getToken();
		removeNewLine();
		if (thisToken != '(')
			putError(lineCount, 13, 'for');
			//info("" + lineCount + " ожидалась открывающая скобка в конструкции for");
		//обрабатываем часть до первой точки с запятой, это выполнится только один раз
		while (thisToken != ';') {
			getToken();
			if (!thisToken)
				return;
			execut();
		}
		registerCount = 1;
		getToken();
		//проверка будет выполнятся каждую итерацию
		asm.push('start_for_' + labe + ':');
		execut();
		while (thisToken != ';') {
			getToken();
			if (!thisToken)
				return;
			execut();
		}
		registerCount--;
		asm.push(' CMP R' + registerCount + ',0');
		asm.push(' JZ end_for_' + labe);
		//запоминаем третий параметр if, не транслируя, он будет выполнятся в конце цикла
		startToken = thisTokenNumber;
		while (!(thisToken == ')' && bracketCount == 0)) {
			if (thisToken == '(')
				bracketCount++;
			else if (thisToken == ')')
				bracketCount--;
			getToken();
			if (!thisToken)
				return;
		}
		getToken();
		removeNewLine();
		if (thisToken == '{') {
			skipBrace();
		} else {
			execut();
			if(isVar(thisToken)){
				getToken();
				execut();
			}
		}
		//теперь транслируем третий параметр
		memToken = thisTokenNumber;
		thisTokenNumber = startToken;
		registerCount = 1;
		getToken();
		skipBracket();
		//и восстанавливаем позицию транслирования
		thisTokenNumber = memToken;
		asm.push(' JMP start_for_' + labe + ' \nend_for_' + labe + ':');
		registerCount = 1;
	}

        function ternaryToken(){
                var labe = labelNumber;
                var saveRegCount;
                labelNumber += 2;
                registerCount--;
                asm.push(' CMP R' + registerCount + ',0');
		asm.push(' JZ end_ternary_' + labe);
                // asm.push(' JZ end_ternary_' + labe);
                saveRegCount = registerCount;
                while (thisToken != ':') {
                        getToken();
                        if (!thisToken)
                                return;
                        execut();
                }
                asm.push(' JMP end_ternary_' + (labe + 1) + ':');
                asm.push('end_ternary_' + labe + ':');
                registerCount = saveRegCount;
		while (thisToken != ';' && thisToken != ']' && thisToken != ')') {
			getToken();
			if (!thisToken)
				return;
			execut();
		}
		// // registerCount = 1;
		// // getToken();
                // getToken();
                // execut();
                asm.push('end_ternary_' + (labe + 1) + ':');
        }

	function switchToken() {
		var labe = labelNumber;
		labelNumber++;
		getToken();
		if (thisToken != '(')
			putError(lineCount, 13, 'switch');
			//info("" + lineCount + " ожидалась открывающая скобка в конструкции switch");
		skipBracket();
		registerCount--;
		//оставляем пустую ячейку в таблице asm и запоминаем ее позицию, сюда будем добавлять весь код, сгенерированный case
		switchStack.push({
			block: asm.length,
			labe: labe
		});
		asm.push(' ');
		asm.push(' JMP end_switch_' + labe);
		getToken();
		removeNewLine();
		if (thisToken == '{') {
			skipBrace();
		} else {
			putError(lineCount, 13, 'switch');
			//info("" + lineCount + " ожидалась открывающая фигурная скобка в конструкции switch");
		}
		asm.push('end_switch_' + labe + ':');
		switchStack.pop();
		getToken();
		removeNewLine();
	}

	function caseToken() {
		var lastSwitch = {
			block: 0,
			labe: 0
		};
		var labe = labelNumber;
		labelNumber++;
		//ищем к какому switch относится этот case
		if (switchStack.length > 0)
			lastSwitch = switchStack[switchStack.length - 1];
		else
			putError(lineCount, 14, '');
			//info("" + lineCount + " отсутствует конструкция switch ");
		getToken();
		if (isNumber(thisToken)) {
			asm[lastSwitch.block] += 'CMP R1,' + parseNumber(thisToken) + ' \n JZ case_' + labe + '\n ';
			asm.push(' case_' + labe + ':');
			getToken();
			if (thisToken != ':')
				putError(lineCount, 15, '');
				//info("" + lineCount + " ожидалось двоеточие ");
		} else {
			putError(lineCount, 16, '');
			//info("" + lineCount + " ожидалось число ");
		}
	}

	function defaultToken() {
		var lastSwitch = {
			block: 0,
			labe: 0
		};
		var labe = labelNumber;
		labelNumber++;
		if (switchStack.length > 0)
			lastSwitch = switchStack[switchStack.length - 1];
		else
			putError(lineCount, 14, '');
			//info("" + lineCount + " отсутствует конструкция switch ");
		getToken();
		if (thisToken != ':')
			putError(lineCount, 15, '');
			//info("" + lineCount + " ожидалось двоеточие ");
		asm[lastSwitch.block] += 'JMP default_' + labe + '\n ';
		asm.push(' default_' + labe + ':');
	}
	//break в данный момент работает только для прерывания switch, нужно доработать
	function breakToken() {
		var lastSwitch = {
			block: 0,
			labe: 0
		};
		if (switchStack.length > 0) {
			lastSwitch = switchStack[switchStack.length - 1];
			asm.push(' JMP end_switch_' + lastSwitch.labe);
		} else
			putError(lineCount, 14, '');
			//info("" + lineCount + " отсутствует конструкция switch ");
	}

	function typedefToken() {
		var typedef = thisToken;
		if (typedef == 'struct') {
			var members = [];
			var structlen = 0;
			getToken();
			var typename = thisToken;
			if (isUsedName(typename)) {
				// wrong name
				putError(lineCount, 22, par);
				return;
			}
			getToken();
			removeNewLine();
			if (thisToken == '{') {
				getToken();
				removeNewLine();
				while (isType(thisToken)) {
					var membert = thisToken;
					getToken();
					while (isValidName(thisToken)) {
						members.push({name: thisToken, type: membert, length: typeTable.get(membert).length, index: structlen});
						structlen += typeTable.get(membert).length;
						getToken();
						if (thisToken == ';') break;
						if (thisToken == ',') getToken();
					}
					if (thisToken != ';') {
						putError(lineCount, 17, '');
						return;
					}
					getToken();
					removeNewLine();
				}
				if (thisToken != '}') {
					putError(lineCount, 24, '}');
					// unexpected token!
					return;
				}
				getToken();
				if (thisToken != ';') {
					putError(lineCount, 24, ';');
					// unexpected token!
					return;
				}
				// complete struct, now define in typeTable
				typeTable.set(typename, {name: typename, length: structlen, members: members}); 
				typeTable.set('*'+typename, {name: '*'+typename, length: 1, members: []}); 
			} else {
				putError(lineCount, 24, '{');
				// brace expected!
			}
		} else {
		  // error typedef not supported!
		}
	}

	//обработка объявления типа, предполагаем что за ним следует объявление переменной или функции
	function typeToken() {
		var type = thisToken;
		var typedef = typeTable.get(type);
		var isInline = false;
		var isVolatile = false;
		if(lastToken == '*')
			type = '*' + type;
		else if (lastToken == 'volatile') isVolatile = true; 
		else if (lastToken == 'inline') isInline = 'inline'; 
		getToken();
		if (thisToken == '(') {
			skipBracket();
			typeCastToFirst(registerCount-1, type);
			return;
		}
		removeNewLine();
		if (thisToken == '*' || thisToken == '&'){
			if(thisToken == '*')
				type = thisToken + type;
			getToken();
		}
		//приведение типа, не реализовано
		if (thisToken == ')') {
			getToken();
			execut();
			return;
		}
		getToken();
		//вызываем регестрацию функции
		if (thisToken == '(') {
			previousToken();
			if (isVolatile) putError(lineCount, 17, 'functions cannot be volatile');
			if (typedef.length > 1) putError(lineCount, 17, 'functions can only return basic types');
			addFunction(type,isInline);
		} else if (thisToken == '[') {
			if (isVolatile || isInline) putError(lineCount, 17, 'arrays cannot be inline or volatile');
			addArray(type);
		}
		//объявление переменных одного типа через запятую, присваивание при этом не поддерживается
		else if (thisToken == ',') {
			previousToken();
			addVar(type,isVolatile);
			getToken();
			while (thisToken && thisToken != ';') {
				getToken();
				addVar(type,isVolatile);
				getToken();
				if (!(thisToken == ',' || thisToken == ';'))
					putError(lineCount, 17, '');
					//info("" + lineCount + " неподдерживаемое объявление переменных");
			}
		} else {
			previousToken();
			addVar(type,isVolatile);
		}
	}
	//обработка указателей, стандарту не соответствует
	function notToken() {
		if (thisToken == '!') {
			getToken();
			execut();
			asm.push(' NOTL R'+(registerCount-1));
		} else if (thisToken == '~') {
			getToken();
			execut();
			asm.push(' NOT R'+(registerCount-1));
		}
	}

	function pointerToken() {
		if (thisToken == '&') {
			getToken();
			if (functionVarTable.indexOf(thisToken) > 0) {
				asm.push(' MOV R' + registerCount + ',R0 \n LDC R' + (registerCount + 1) + ',' + (functionVarTable.indexOf(thisToken) * 2));
				asm.push(' ADD R' + registerCount + ',R' + (registerCount + 1));
				registerCount++;
			} else if (isVar(thisToken)) {
				asm.push(' LDI R' + registerCount + ',_' + thisToken);
				registerCount++;
			} else {
				putError(lineCount, 24, " variable after &");
			}
		} else if (thisToken == '*') {
			getToken();
			if (functionVarTable.indexOf(thisToken) > 0) {
				asm.push(' LDI R' + registerCount + ',(' + (localStackLength * 2 + functionVarTable.length + localVarTable.length - functionVarTable.indexOf(thisToken) + 1) + '+R0) ;' + thisToken);
				asm.push(' LDI R' + registerCount + ',(R' + registerCount + ')');
				registerCount++;
			} else if (isVar(thisToken)) {
				asm.push(' LDI R' + registerCount + ',(_' + thisToken + ')');
				asm.push(' LDI R' + registerCount + ',(R' + registerCount + ')');
				registerCount++;
			} else if (thisToken == '(') {
				execut();
				registerCount--;
				asm.push(' LDI R' + registerCount + ',(R' + registerCount + ')');
				registerCount++;
			} else {
				putError(lineCount, 24, " ( or variable after *");
			}
		}
	}
	//обработка строки. Добавляет строку и оставляет в регистре ссылку на нее
	function stringToken() {
		var labe = labelNumber;
		labelNumber++;
		dataAsm.push('_str' + labe + ':');
		pushString();
		asm.push(' LDI R' + registerCount + ',_str' + labe);
		registerCount++;
	}
	//удаляем перевод строки, если есть
	function removeNewLine() {
		var s;
		if (thisToken === '\n') {
			if (lastToken == ';')
				registerCount = 1;
			if (thisTokenNumber - lastEndString > 1) {
				//добавляем информацию для отладки
				numberDebugString.push([asm.length, lineCount, 0]);
				//добавляем комментарии в таблицу asm для отладки
				s = ';' + lineCount + ' ' + t.slice(lastEndString, thisTokenNumber - 1).join(' ').replace(/\r|\n/g, '');
				if (s.length > 40)
					s = s.substring(0, 40) + '...';
				asm.push(s);
			}
			//пропускаем все последующие пустые переводы строки
			while (thisToken === '\n') {
				lineCount++;
				lastEndString = thisTokenNumber;
				getToken();
			}
		}
	}
	//выполняем блок скобок
	function skipBracket() {
		while (thisToken && thisToken != ')' && thisToken != ';') {
			if (getRangOperation(thisToken) == -1)
				getToken();
			if (!thisToken)
				return;
		//	if (thisToken == ';') { 
		//		putError(lineCount, 7, 'unexpected end of statement ;');
		//		return;
		//	}
			execut();
		}
		removeNewLine();
		
	}
	//выполняем блок фигурных скобок
	function skipBrace() {
		while (thisToken && thisToken != '}') {
			getToken();
			if (!thisToken)
				return;
			execut();
		}
		getToken();
		if(thisToken != ';')
			previousToken();
		removeNewLine();
		registerCount = 1;
	}
	//определение типа токена и необходимой операции
	function execut() {
		//выйти, если токены закончились
		if (!thisToken) {
			return;
		}
		removeNewLine();
		if (isTypeDef(thisToken)) {
			typedefToken();
		} else if (isType(thisToken)) {
			typeToken();
		} else if (functionVarTable.indexOf(thisToken) > 0 || localVarTable.indexOf(thisToken) > 0) {
			localVarToken();
		} else if (isVar(thisToken)) {
			varToken();
		} else if (isFunction(thisToken)) {
			callFunction(thisToken);
		} else if (isNumber(thisToken)) {
                        if (isFloat(thisToken)) {
                                thisToken = '' + parseNumber(thisToken);
                                asm.push(' LDI R' + registerCount + ',' + thisToken);
                                typeOnStack[registerCount] = 'fixed';
                        } else {
                                thisToken = '' + parseNumber(thisToken);
                                if ((thisToken * 1) < 255 && (thisToken * 1) >= 0) {
                                        asm.push(' LDC R' + registerCount + ',' + thisToken);
                                        typeOnStack[registerCount] = 'char';
                                } else {
                                        asm.push(' LDI R' + registerCount + ',' + thisToken);
                                        typeOnStack[registerCount] = 'int';
                                }
                        }
			registerCount++;
		} else if (getRangOperation(thisToken) > 0) {
			//в этих условиях скорее всего работа с указателями, но это не всегда так, нужно улучшить
			if ((thisToken == '!' || thisToken == '~') && (getRangOperation(lastToken) >= 0 || lastToken == '(' || lastToken == ','))
				notToken();
			else if (thisToken == '&' && (getRangOperation(lastToken) >= 0 || lastToken == '(' || lastToken == ','))
				pointerToken();
			else if (thisToken == '*' && (getRangOperation(lastToken) >= 0 || lastToken == '(' || lastToken == ','))
				pointerToken();
			else if (thisToken == '*' && registerCount == 1){
				pointerstar = true;
				getToken();
				execut();
				pointerstar = false;
			}
			else if (thisToken == '+' || thisToken == '-' || thisToken == '++' || thisToken == '--')
				addSub();
			else if (thisToken == '*' || thisToken == '/' || thisToken == '%')
				divMul();
			else if (thisToken == '&' || thisToken == '|' || thisToken == '^' || thisToken == '&&' || thisToken == '||' )
				andOrXor();
			else if (thisToken == '?') 
				ternaryToken();
			else if (thisToken == ':')
				return;
			else
				compare();
			return;
		} else if (thisToken == '(') {
			skipBracket();
			if (thisToken == ';')
				putError(lineCount, 3, '');
				//info("" + lineCount + " ожидалась скобка");
			getToken();
		} else if (thisToken == '=' || thisToken == '+=' || thisToken == '-=' || thisToken == '*=' || thisToken == '/=') {
			assigment();
		} else if (thisToken == ';') {
			return;
//		} else if (thisToken == ':') {
//			return;
		} else if (thisToken == '{') {
			skipBrace();
			getToken();
		} else if (thisToken == '}' || thisToken == ']' || thisToken == ')' || thisToken == ',') {
			return;
		} else if (thisToken == 'true') {
			asm.push(' LDC R' + registerCount + ',1');
		} else if (thisToken == 'false') {
			asm.push(' LDC R' + registerCount + ',0');
		} else if (thisToken == 'return') {
			returnToken();
		} else if (thisToken == 'if') {
			ifToken();
		} else if (thisToken == 'else') {
			return;
		} else if (thisToken == 'while') {
			whileToken();
		} else if (thisToken == 'for') {
			forToken();
		} else if (thisToken == 'switch') {
			switchToken();
		} else if (thisToken == 'case') {
			caseToken();
		} else if (thisToken == 'default') {
			defaultToken();
		} else if (thisToken == 'inline') {
			getToken();
			if (isType(thisToken)) {
				typeToken();
			} else {
				putError(lineCount, 20, 'inline must be followed by function declaration');
			}
		} else if (thisToken == 'volatile') {
			getToken();
			if (isType(thisToken)) {
				typeToken();
			} else {
				putError(lineCount, 20, 'volatile must be followed by variable declaration');
			}
		} else if (thisToken == 'break') {
			breakToken();
		} else if (thisToken == 'unsigned') {
			putError(lineCount, 19, 'unsigned');
			//info("" + lineCount + "предупреждение, unsigned не реализовано " + thisToken);
			return;
		} else if (thisToken[0] == '"') {
			stringToken();
		} else {
			if (thisToken.length > 0)
				putError(lineCount, 20, thisToken);
				//info("" + lineCount + " неизвестный токен " + thisToken);
		}
	}

	function optimize() {
		for (var i = 0; i < asm.length; i++) {
			var ni = i + 1;
			var pi = i - 1;
			if (asm[i].startsWith(' CMP')) {
				if(asm[pi].startsWith(' LDI') || asm[pi].startsWith(' LDC')) {
					// match number and change CMP to CMP int
					var opregs = asm[pi].match(/R\d+/);
					var val = asm[pi].match(/,\-?\d+/);
					if (!asm[ni].startsWith(' DIVRES') && asm[ni].match(/LDF R\d+,4/) == null && val && opregs && asm[i].match(',' + opregs[0])) {
					  asm[pi] = ';O1 ' + asm[pi];
					  pi--;
					  asm[i] = asm[i].replace(','+opregs[0], val[0]);
					}
				}
				if (asm[ni].startsWith(' JZ') || asm[ni].startsWith(' JNZ') || asm[ni].match(/LDF R\d+,1/)) {
				// if of ?: op
					if (asm[pi].startsWith(' LDF')) {
						// look for flag 1,2,3 or 5
						var res = asm[pi].match(/,\d/);
						switch (res[0]) {
						case ',1':
							asm[pi] = ';O1 ' + asm[pi];
							asm[i] = ';O1 ' + asm[i];
							asm[ni] = asm[ni].replace('JZ','JNZ');
							break;
						case ',2':
							asm[pi] = ';O1 ' + asm[pi];
							asm[i] = ';O1 ' + asm[i];
							asm[ni] = asm[ni].replace('JZ','JP');
							break;
						case ',4':
							var opregs = asm[pi-1].match(/R\d+/g);
							if (opregs[0] && opregs[1]) {
								asm[pi-1] = ' CMP '+opregs[1]+','+opregs[0]; 
								asm[pi] = ';O1 ' + asm[pi];
								asm[i] = ';O1 ' + asm[i];
								asm[ni] = asm[ni].replace('JZ','JNP');
							}
							break;
						case ',5':
							asm[pi] = ';O1 ' + asm[pi];
							asm[i] = ';O1 ' + asm[i];
							break;
						}
					}
				} 
				if (!asm[pi].startsWith(' LDF') && !asm[pi].startsWith(' MOV') && !asm[pi].startsWith(' POP') && !asm[pi].startsWith(' LDRES')) {
				  var opregs = asm[pi].match(/R\d+/);
				  if (opregs && asm[i].match(opregs[0]+',0')) {
 				  	// then CMP with 0 is abundant
					asm[i] = ';O1 ' + asm[i];
				  }
				}
                        }
			if (asm[i].startsWith(' PUSH')) {
				if(asm[pi].startsWith(' LDI') || asm[pi].startsWith(' LDC')) {
					// match number and change PUSH to CMP int
					var opregs = asm[pi].match(/R\d+/);
					var val = asm[pi].match(/,\-?\d+/);
					if (val && opregs && asm[i].match(' ' + opregs[0])) {
					  asm[pi] = ';O1 ' + asm[pi];
					  pi--;
					  val[0] = val[0].slice(1);
					  asm[i] = asm[i].replace(opregs[0], val[0]);
					}
				}
			}
                }

		// Compress comp & jump
		// find highest used register
		// sort variables by use
		// varTable.sort((a, b) => (a.uses < b.uses) ? 1 : -1);
		// replace global vars with registers if possible
	}

	numberDebugString = [];
	console.time("compile");
	initTypes();
	registerFunction('setstack', 'void', ['int', 'a'], 1, 'MOV R0,R%1', 'inline', 0);
	registerFunction('setdrwaddr', 'void', ['int', 'a'], 1, 'DRWADR R%1', 'inline', 0);
	registerFunction('rstdrwaddr', 'void', [], 1, 'RSTDAD', 'inline', 0);
	registerFunction('memset', 'void', ['int', 'to', 'int', 'val', 'int', 'num'], 1, 'MEMSET R0', 'builtin', 0);
	registerFunction('memcpy', 'void', ['int', 'to', 'int', 'from', 'int', 'num'], 1, 'MEMCPY R0', 'builtin', 0);
	registerFunction('peek', 'int', ['int', 'adr'], 1, 'LDC R%1,(R%1)', 'inline', 0);
	registerFunction('peek2', 'int', ['int', 'adr'], 1, 'LDI R%1,(R%1)', 'inline', 0);
	registerFunction('poke', 'void', ['int', 'adr', 'int', 'val'], 1, 'STC (R%2),R%1', 'inline', 0);
	registerFunction('poke2', 'void', ['int', 'adr', 'int', 'val'], 1, 'STI (R%2),R%1', 'inline', 0);
	registerFunction('cbismapcoll', 'int', ['int', 'e'], 1, 'LDI R15,32768 \n AND R%1,R15', 'inline', 0);
	registerFunction('cbisevent', 'int', ['int', 'n', 'int', 'event'], 1, 'AND R%2,R%1', 'inline', 0);
	registerFunction('cbmapx', 'int', ['int', 'e'], 1, 'LDC R15,127 \n AND R%1,R15', 'inline', 0);
	registerFunction('cbmapy', 'int', ['int', 'e'], 1, 'LDC R15,8 \n SHR R%1,R15', 'inline', 0);
	registerFunction('cbactor', 'int', ['int', 'n'], 1, 'LDC R15,31 \n AND R%1,R15', 'inline', 0);
	registerFunction('i2f', 'fixed', ['int', 'i'], 1, 'MULRES '+FIXED_POINT_Q+',R%1', 'inline', 0);
	registerFunction('f2i', 'int', ['fixed', 'f'], 1, 'CMP R%1,0 \n DIVRES '+FIXED_POINT_Q+',R%1', 'inline', 0);
	registerFunction('flr', 'fixed', ['fixed', 'f'], 1, 'LDI R15,-'+(1 << FIXED_POINT_Q)+' \n AND R%1,R15', 'inline', 0);
	registerFunction('ceil', 'fixed', ['fixed', 'f'], 1, 'LDI R15,'+((1 << FIXED_POINT_Q)-1)+' \n AND R15,R%1 \n LDF R15,5 \n MULRES '+FIXED_POINT_Q+',R15 \n PUSH R15 \n LDI R15,-'+(1 << FIXED_POINT_Q)+' \n AND R%1,R15 \n POP R15 \n ADD R%1,R15', 'inline', 0);
	registerFunction('frac', 'fixed', ['fixed', 'f'], 1, 'LDI R15,'+((1 << FIXED_POINT_Q)-1)+' \n AND R%1,R15', 'inline', 0);
	registerFunction('frac10k', 'int', ['fixed', 'f'], 1, 'LDI R15,'+((1 << FIXED_POINT_Q)-1)+' \n AND R%1,R15 \n LDI R15,10000 \n MUL R%1,R15 \n LDRES '+FIXED_POINT_Q+',R%1', 'inline', 0);
	registerFunction('fmf', 'fixed', ['fixed', 'f', 'fixed', 'g'], 1, 'MUL R%2,R%1 \n LDRES '+FIXED_POINT_Q+',R%2', 'inline', 0);
	registerFunction('fdf', 'fixed', ['fixed', 'f', 'fixed', 'd'], 1, 'MULRES '+FIXED_POINT_Q+',R%2 \n DIVRES 0,R%1 \n MOV R%2,R%1', 'inline', 0);
	registerFunction('intcoords', 'void', [], 1, 'LDC R15,0 \n ESPICO 1,R15', 'inline', 0);
	registerFunction('fixpcoords', 'void', [], 1, 'LDC R15,'+FIXED_POINT_Q+' \n ESPICO 1,R15', 'inline', 0);
	registerFunction('coordshift', 'void', ['int', 's'], 1, 'ESPICO 1,R%1', 'inline', 0);
	registerFunction('flip', 'void', [], 1, 'FLIP', 'inline', 0);
	registerFunction('rnd', 'int', ['int', 'i'], 1, 'RAND R%1', 'inline', 0);
	registerFunction('sqrt', 'int', ['int', 'n'], 1, 'SQRT R%1', 'inline', 0);
	registerFunction('cos', 'int', ['int', 'n'], 1, 'COS R%1', 'inline', 0);
	registerFunction('sin', 'int', ['int', 'n'], 1, 'SIN R%1', 'inline', 0);
	registerFunction('abs', 'int', ['int', 'n'], 1, 'ABS R%1', 'inline', 0);
	registerFunction('atan2', 'int', ['int', 'y', 'int', 'x'], 1, 'ATAN2 R%2,R%1', 'inline', 0);
	registerFunction('printc', 'char', ['char', 'c'], 1, 'PUTC R%1', 'inline', 0);
	registerFunction('print', 'void', ['*char', 'c'], 1, 'PUTS R%1', 'inline', 0);
	registerFunction('printn', 'void', ['int', 'n'], 1, 'PUTN R%1', 'inline', 0);
	registerFunction('printfp', 'void', ['int', 'f'], 1, 'CMP R%1,0 \n PUTRES '+FIXED_POINT_Q, 'inline', 0);
	registerFunction('tmrget', 'int', ['int', 'n'], 1, 'GTIMER R%1', 'inline', 0);
	registerFunction('tmrset', 'void', ['int', 'n', 'int', 'time'], 1, 'STIMER R%2,R%1', 'inline', 0);
	registerFunction('cls', 'void', [], 1, 'CLS', 'inline', 0);
	registerFunction('palrst', 'void', [], 1, 'RPALET', 'inline', 0);
	registerFunction('palt', 'void', ['int', 'm'], 1, 'PALT R%1', 'inline', 0);
	registerFunction('fcol', 'void', ['int', 'c'], 1, 'SFCLR R%1', 'inline', 0);
	registerFunction('bcol', 'void', ['int', 'c'], 1, 'SBCLR R%1', 'inline', 0);
	registerFunction('pal', 'void', ['int', 'n', 'int', 'c'], 1, 'SPALET R%2,R%1', 'inline', 0);
	registerFunction('cget', 'int', [], 1, 'GETK R%0', 'inline', 0);
	registerFunction('kget', 'int', [], 1, 'GETJ R%0', 'inline', 0);
	registerFunction('btn', 'int', ['int', 'b'], 1, 'BTN R%1', 'inline', 0);
	registerFunction('btnp', 'int', ['int', 'b'], 1, 'BTNP R%1', 'inline', 0);
	registerFunction('pset', 'void', ['int', 'x', 'int', 'y'], 1, 'PPIX R%2,R%1', 'inline', 0);
	registerFunction('pget', 'int', ['int', 'x', 'int', 'y'], 1, 'GETPIX R%2,R%1', 'inline', 0);
	registerFunction('atstcoll', 'void', [], 1, 'TACTC', 'inline', 0);
	registerFunction('amove', 'void', ['int', 'n'], 1, 'MVACT R%1', 'inline', 0);
	registerFunction('adraw', 'void', ['int', 'n'], 1, 'DRWACT R%1', 'inline', 0);
	registerFunction('apos', 'void', ['int', 'n', 'int', 'x', 'int', 'y'], 1, 'ACTPOS R%3,R%2,R%1', 'inline', 0);
	registerFunction('axy', 'int', ['int', 'x', 'int', 'y'], 1, 'ACTXY R%2,R%1', 'inline', 0);
	registerFunction('fset', 'void', ['int', 's', 'int', 'f'], 1, 'FSET R%2,R%1', 'inline', 0);
	registerFunction('fget', 'void', ['int', 's'], 1, 'FGET R%1', 'inline', 0);
	registerFunction('mget', 'int', ['int', 'x', 'int', 'y'], 1, 'GMAPXY R%2,R%1', 'inline', 0);
	registerFunction('mset', 'void', ['int', 'x', 'int', 'y', 'int', 'v'], 1, 'SMAPXY R0', 'builtin', 0);

        registerFunction('tone', 'void', ['int', 'freq', 'int', 'time'], 1, 'PLAYTN R%2,R%1', 'inline', 0);
        registerFunction('loadrt', 'void', ['int', 'adr', 'int', 'loop'], 1, 'LOADRT R%2,R%1', 'inline', 0);
        registerFunction('playrt', 'void', [], 1, 'PLAYRT', 'inline', 0);
        registerFunction('pausert', 'void', [], 1, 'PAUSERT', 'inline', 0);
        registerFunction('stoprt', 'void', [], 1, 'STOPRT', 'inline', 0);

	registerFunction('a2a', 'int', ['int', 'n1', 'int', 'n2'], 1, 'AGBACT R%2,R%1', 'inline', 0);
	registerFunction('aget', 'int', ['int', 'n', 'int', 'type'], 1, 'ACTGET R%2,R%1', 'inline', 0);
	registerFunction('aset', 'void', ['int', 'n', 'int', 'type', 'int', 'value'], 1, 'ACTSET R%3,R%2,R%1', 'inline', 0);
	registerFunction('arst', 'void', ['int', 'n'], 1, 'LDI R15,-1 \n ACTSET R%1,R15,R15', 'inline', 0);
	registerFunction('flipxy', 'void', ['int', 'fxy'], 1, 'IMOPTS R%1', 'inline', 0);
	registerFunction('zoom', 'void', ['int', 's'], 1, 'IMOPTS R%1', 'inline', 0);
	registerFunction('cursor', 'void', ['int', 'x', 'int', 'y'], 1, 'SETX R%2 \n SETY R%1', 'inline', 0);
	registerFunction('camera', 'void', ['int', 'x', 'int', 'y'], 1, 'ESPICO 2,R%2 \n ESPICO 3,R%1', 'inline', 0);
	registerFunction('clip', 'void', ['int', 'x', 'int', 'y', 'int', 'w', 'int', 'h'], 1, 'CLIP R0', 'builtin', 0);
	registerFunction('line', 'void', ['int', 'x', 'int', 'y', 'int', 'x1', 'int', 'y1'], 1, 'DLINE R0', 'builtin', 0);
	registerFunction('circ', 'void', ['int', 'x', 'int', 'y', 'int', 'r'], 1, 'DCIRC R0', 'builtin', 0);
	registerFunction('circfill', 'void', ['int', 'x', 'int', 'y', 'int', 'r'], 1, 'FCIRC R0', 'builtin', 0);
	registerFunction('rect', 'void', ['int', 'x', 'int', 'y', 'int', 'x1', 'int', 'y1'], 1, 'DRECT R0', 'builtin', 0);
	registerFunction('rectfill', 'void', ['int', 'x', 'int', 'y', 'int', 'x1', 'int', 'y1'], 1, 'FRECT R0', 'builtin', 0);
	registerFunction('aspd', 'void', ['int', 'n', 'int', 'speed', 'int', 'dir'], 1, 'ACTDS R0', 'builtin', 0);
	registerFunction('dist', 'int', ['int', 'x1', 'int', 'y1', 'int', 'x2', 'int' , 'y2'], 1, '_dist: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n DISTPP R1 \n RET', false, 0);
	registerFunction('atstmap', 'void', ['int', 'celx', 'int', 'cely', 'int', 'sx', 'int', 'sy', 'int', 'celw', 'int', 'celh', 'int', 'layer'], 1, 'TACTM R0', 'builtin', 0);
	registerFunction('img', 'void', ['int', 'a', 'int', 'x', 'int', 'y', 'int', 'w', 'int', 'h'], 1, 'DRWIM R0', 'builtin', 0);
	registerFunction('img1bit', 'void', ['int', 'a', 'int', 'x', 'int', 'y', 'int', 'w', 'int', 'h'], 1, 'DRWBIT R0', 'builtin', 0);
	registerFunction('spr', 'void', ['int', 'a', 'int', 'x', 'int', 'y', 'int', 'w', 'int', 'h'], 1, 'DRWSPR R0', 'builtin', 0);
	dataAsm = [];
	dataAsm.push('_partcolor: \n MOV R1,R0 \n LDC R2,2 \n ADD R1,R2 \n MPARTC R1 \n RET');
	registerFunction('partcolor', 'int', ['int', 'col1', 'int', 'col2', 'int', 'prefsteps', 'int', 'ptype'], 1, dataAsm, false, 0);
	registerFunction('parttime', 'void', ['int', 'time', 'int', 'diff'], 1, 'SPART R0', 'builtin', 0);
	registerFunction('partdir', 'void', ['int', 'gravity', 'int', 'dir', 'int', 'dir1', 'int', 'speed'], 1, 'SEMIT R0', 'builtin', 0);
	registerFunction('partset', 'void', ['int', 'x', 'int', 'y', 'int', 'pcolor', 'int', 'radpx', 'int', 'count'], 1, 'DPART R0', 'builtin', 0);
	registerFunction('partdraw', 'void', [], 1, 'APART', 'inline', 0);
	registerFunction('map', 'void', ['int', 'celx', 'int', 'cely', 'int', 'sx', 'int', 'sy', 'int', 'celw', 'int', 'celh', 'int', 'layer'], 1, 'DRWMAP R0', 'builtin', 0);
	dataAsm = [];
	dataAsm.push('_printf: \n MOV R2,R0 \n ADD R2,R1 \n MOV R1,R2 \n LDI R2,(R2) \n LDC R3,(R2) \nnext_printf_c:')
	dataAsm.push(' CMP R3,37 ;% \n JZ printf_get\n PUTC R3\n INC R2 \n LDC R3,(R2) \n JNZ next_printf_c');
	dataAsm.push(' RET \nnext_printf_c_end:\n INC R2 \n LDC R3,(R2)\n JNZ next_printf_c \n RET\nprintf_get:');
	dataAsm.push(' INC R2 \n LDC R3,(R2) \n CMP R3,37 ;%\n JZ printf_percent\n DEC R1,2 \n LDI R4,(R1)');
	dataAsm.push(' CMP R3,100 ;d\n JZ printf_d \n CMP R3,105 ;i\n JZ printf_d \n CMP R3,115 ;s\n JZ printf_s \n CMP R3,99 ;c\n JZ printf_c');
	dataAsm.push(' CMP R3,102 ;f\n JZ printf_f \n JMP next_printf_c \nprintf_percent:\n PUTC R3 \n JMP next_printf_c_end \nprintf_d: \n PUTN R4');
	dataAsm.push(' JMP next_printf_c_end\nprintf_c: \n PUTC R4\n JMP next_printf_c_end\nprintf_s:\n PUTS R4 \n JMP next_printf_c_end');
	dataAsm.push(' printf_f:\n CMP R4,0 \n PUTRES '+FIXED_POINT_Q+' \n JMP next_printf_c_end');
	registerFunction('printf', 'int', ['*char', 's', '...'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('_free:\n LDI R1,(2 + R0)\n DEC R1,2\n LDI R3,32768\n LDI R2,(R1)\n SUB R2,R3\n LDI R4,(R1+R2)\n CMP R4,0\n JZ end_free_0');
	dataAsm.push(' CMP R3,R4\n JP next_free\n STI (R1),R2\n RET \nend_free_0:\n LDI R2,0\n STI (R1),R2\n RET\nnext_free:\n ADD R2,R4');
	dataAsm.push(' LDI R4,(R1+R2)\n CMP R4,0\n JZ end_free_0\n CMP R3,R4\n JP next_free\n STI (R1),R2 \n RET');
	registerFunction('free', 'void', ['int', 'a'], 1, dataAsm, false, 0);
	dataAsm = [];
	dataAsm.push('\n_malloc: \n LDI R2,(2 + R0)\n CMP R2,0 \n JZ end_malloc \n  MOV R5,R2\n LDC R4,1\n AND R5,R4\n CMP R5,1\n JNZ next_malloc');
	dataAsm.push(' INC R2\nnext_malloc:\n INC R2,2\n LDI R1,#END \n LDI R4,32768 ;0x8000\nnext_byte:\n LDI R3,(R1)\n CMP R3,R4');
	dataAsm.push(' JNP malloc1 \n SUB R3,R4\n ADD R1,R3 \n CMP R1,R0 \n JP end_malloc\n JMP next_byte\nmalloc1:\n CMP R3,0 \n JNZ malloc2');
	dataAsm.push(' MOV R5,R2\n ADD R5,R1\n CMP R5,R0 \n JP end_malloc\n ADD R2,R4\n STI (R1),R2\n INC R1,2\n RET\nmalloc2: \n MOV R6,R3');
	dataAsm.push(' SUB R6,R2\n JNP next_byte1 \n MOV R5,R2\n ADD R5,R1\n CMP R5,R0\n JP end_malloc\n ADD R2,R4\n STI (R1),R2\n INC R1,2');
	dataAsm.push(' CMP R6,0 \n JZ ret_malloc\n STI (R5),R6\n RET\n next_byte1: \n ADD R1,R3 \n JMP next_byte \nend_malloc:\n LDC R1,0\n RET');
	dataAsm.push('ret_malloc:\n RET');
	registerFunction('malloc', 'int', ['int', 'l'], 1, dataAsm, false, 0);
	dataAsm = [];
	//основной цикл компиляции, выполняется пока есть токены на входе
	while (getToken()) {
		execut();
	}
	//указываем место для кучи, если нужно
	if(isFunction('malloc'))
		asm.push(' LDI R15,0 \n STI (#END),R15');
	//в конце программы вызываем main если есть
	if (isFunction('main')){
		for (var i = 0; i < functionTable.length; i++) {
			if (functionTable[i].name == 'main'){
				if (functionTable[i].varLength > 0) {
					if (functionTable[i].varLength < 15)
						asm.push(' DEC R0,' + functionTable[i].varLength);
					else
						asm.push(' LDC R15,' + functionTable[i].varLength + '\n SUB R0,R15');
				}
				break;
			}
		}
		asm.push(' CALL _main');
	}
	//если ее нет, то программа будет работать все равно
	else {
	    if (isFunction('update') && isFunction('draw')) {
		// asm.push(' JMP _end_main');
		gameloopAsm = [];
		gameloopAsm.push('_main: \n');
		if (isFunction('init')) {
			gameloopAsm.push('CALL _init');
		}
		gameloopAsm.push('CALL _update');
		gameloopAsm.push('LDC R15,1 \n ESPICO 0,R15');
		gameloopAsm.push('CALL _draw');
		gameloopAsm.push('LDC R15,0 \n ESPICO 0,R15');
		gameloopAsm.push('start_gameloop:');
		gameloopAsm.push('CALL _update');
		gameloopAsm.push('FLIP');
		gameloopAsm.push('LDC R15,1 \n ESPICO 0,R15');
		gameloopAsm.push('CALL _draw');
		gameloopAsm.push('LDC R15,0 \n ESPICO 0,R15');
		gameloopAsm.push('JMP start_gameloop');
		gameloopAsm.push('end_gameloop: \n RET');
		registerFunction('main', 'void', [], 1, gameloopAsm, false, 0);
		//asm.push('_end_main:');
		asm.push(' CALL _main');

		for (var i = 0; i < functionTable.length; i++) {
                        if (functionTable[i].name == 'main'){
                                functionTable[i].use++;
                        }
                        if (functionTable[i].name == 'init'){
                                functionTable[i].use++;
                        }
                        if (functionTable[i].name == 'update'){
                                functionTable[i].use++;
                        }
                        if (functionTable[i].name == 'draw'){
                                functionTable[i].use++;
                        }
                 }
	    } else {
		putError(lineCount, 21, '');
	    }
	}
		//info("не найдена точка входа в функцию main");
	//при возврате из main останавливаем выполнение программы
	asm.push('HLT');
	//проверяем, были ли хоть раз вызваны функции и добовляем код только вызванных
	for (var i = 0; i < functionTable.length; i++) {
		if (functionTable[i].use > 0 && functionTable[i].inline == false)
			asm = asm.concat(functionTable[i].asm);
	}
	//объеденяем код с данными
	asm = asm.concat(dataAsm);
	console.timeEnd("compile");

	optimize();
	return asm;
}
