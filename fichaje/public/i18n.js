// TMB Fichaje — traducciones. Orden de cada fila: [es, en, ru, ro]
const LANGS = ['es', 'en', 'ru', 'ro'];
const LANG_NAMES = { es: 'Español', en: 'English', ru: 'Русский', ro: 'Română' };
const LOCALES = { es: 'es-ES', en: 'en-GB', ru: 'ru-RU', ro: 'ro-RO' };

const T = {
  app_title: ['Control horario', 'Time tracking', 'Учёт рабочего времени', 'Pontaj'],
  language: ['Idioma', 'Language', 'Язык', 'Limba'],
  username: ['Usuario', 'Username', 'Логин', 'Utilizator'],
  password: ['Contraseña', 'Password', 'Пароль', 'Parolă'],
  sign_in: ['Entrar', 'Sign in', 'Войти', 'Intră'],
  logout: ['Salir', 'Log out', 'Выйти', 'Ieșire'],
  save: ['Guardar', 'Save', 'Сохранить', 'Salvează'],
  cancel: ['Cancelar', 'Cancel', 'Отмена', 'Anulează'],
  edit: ['Editar', 'Edit', 'Изменить', 'Editează'],
  delete: ['Eliminar', 'Delete', 'Удалить', 'Șterge'],
  close: ['Cerrar', 'Close', 'Закрыть', 'Închide'],
  saved: ['Guardado', 'Saved', 'Сохранено', 'Salvat'],
  all: ['Todos', 'All', 'Все', 'Toate'],
  yes: ['Sí', 'Yes', 'Да', 'Da'],
  no: ['No', 'No', 'Нет', 'Nu'],
  loading: ['Cargando…', 'Loading…', 'Загрузка…', 'Se încarcă…'],

  // Operario
  hello: ['Hola', 'Hello', 'Здравствуйте', 'Bună'],
  clock_in: ['Fichar entrada', 'Clock in', 'Начать смену', 'Pontaj intrare'],
  clock_out: ['Fichar salida', 'Clock out', 'Закончить смену', 'Pontaj ieșire'],
  working_on: ['Trabajando en', 'Working on', 'Работаю на', 'Lucrez la'],
  since: ['desde', 'since', 'с', 'de la'],
  not_working: ['No has fichado entrada', 'You are not clocked in', 'Вы не отметили начало смены', 'Nu ați pontat intrarea'],
  select_ot: ['Elige la orden de trabajo', 'Choose the work order', 'Выберите заказ-наряд', 'Alegeți comanda de lucru'],
  no_assigned_ots: ['No tienes órdenes de trabajo asignadas. Contacta con TMB.', 'You have no work orders assigned. Contact TMB.', 'У вас нет назначенных заказ-нарядов. Свяжитесь с TMB.', 'Nu aveți comenzi de lucru alocate. Contactați TMB.'],
  note_optional: ['Observaciones (opcional)', 'Notes (optional)', 'Примечание (необязательно)', 'Observații (opțional)'],
  confirm_clock_in: ['¿Fichar entrada en {ot}?', 'Clock in on {ot}?', 'Начать смену по {ot}?', 'Pontați intrarea la {ot}?'],
  confirm_clock_out: ['¿Fichar salida ahora?', 'Clock out now?', 'Закончить смену сейчас?', 'Pontați ieșirea acum?'],
  my_entries: ['Mis fichajes', 'My time records', 'Мои отметки', 'Pontajele mele'],
  last_days: ['Últimos 31 días', 'Last 31 days', 'Последние 31 день', 'Ultimele 31 de zile'],
  today: ['Hoy', 'Today', 'Сегодня', 'Azi'],
  this_week: ['Esta semana', 'This week', 'Эта неделя', 'Săptămâna aceasta'],
  change_password: ['Cambiar contraseña', 'Change password', 'Сменить пароль', 'Schimbă parola'],
  current_password: ['Contraseña actual', 'Current password', 'Текущий пароль', 'Parola actuală'],
  new_password: ['Nueva contraseña', 'New password', 'Новый пароль', 'Parola nouă'],

  // Navegación admin
  dashboard: ['Panel', 'Dashboard', 'Панель', 'Panou'],
  workers: ['Operarios', 'Workers', 'Работники', 'Muncitori'],
  work_orders: ['Órdenes de trabajo', 'Work orders', 'Заказ-наряды', 'Comenzi de lucru'],
  entries: ['Fichajes', 'Time records', 'Отметки', 'Pontaje'],
  reports: ['Informes', 'Reports', 'Отчёты', 'Rapoarte'],
  audit_log: ['Registro de cambios', 'Change log', 'Журнал изменений', 'Jurnal modificări'],

  // Panel
  currently_working: ['Trabajando ahora', 'Working now', 'Сейчас работают', 'Lucrează acum'],
  nobody_working: ['Nadie ha fichado entrada', 'Nobody is clocked in', 'Никто не на смене', 'Nimeni nu este pontat'],
  open_ots: ['OT abiertas', 'Open WOs', 'Открытые наряды', 'Comenzi deschise'],
  pending_verification: ['Pendientes de verificar', 'Pending verification', 'Ожидают проверки', 'De verificat'],
  active_workers: ['Operarios activos', 'Active workers', 'Активные работники', 'Muncitori activi'],

  // Operarios
  new_worker: ['Nuevo usuario', 'New user', 'Новый пользователь', 'Utilizator nou'],
  edit_user: ['Editar usuario', 'Edit user', 'Изменить пользователя', 'Editează utilizator'],
  full_name: ['Nombre y apellidos', 'Full name', 'Фамилия и имя', 'Nume și prenume'],
  doc_id: ['DNI / NIE / Pasaporte', 'ID / Passport no.', 'Паспорт / NIE', 'Act identitate / Pașaport'],
  company: ['Empresa', 'Company', 'Компания', 'Companie'],
  role: ['Rol', 'Role', 'Роль', 'Rol'],
  role_admin: ['Administrador TMB', 'TMB administrator', 'Администратор TMB', 'Administrator TMB'],
  role_worker: ['Operario', 'Worker', 'Работник', 'Muncitor'],
  active: ['Activo', 'Active', 'Активен', 'Activ'],
  inactive: ['Baja', 'Inactive', 'Неактивен', 'Inactiv'],
  deactivate: ['Dar de baja', 'Deactivate', 'Деактивировать', 'Dezactivează'],
  activate: ['Reactivar', 'Reactivate', 'Активировать', 'Reactivează'],
  confirm_deactivate: ['¿Dar de baja a {name}? Se le retirará de todas sus OT.', 'Deactivate {name}? They will be removed from all their work orders.', 'Деактивировать {name}? Работник будет снят со всех нарядов.', 'Dezactivați {name}? Va fi retras de pe toate comenzile.'],
  password_leave_blank: ['Nueva contraseña (vacío = no cambiar)', 'New password (blank = keep)', 'Новый пароль (пусто = без изменений)', 'Parolă nouă (gol = neschimbată)'],
  assigned_ots: ['OT asignadas', 'Assigned WOs', 'Назначенные наряды', 'Comenzi alocate'],
  clocked_in_on: ['Fichado en', 'Clocked in on', 'На смене:', 'Pontat la'],

  // Órdenes de trabajo
  new_ot: ['Nueva OT', 'New WO', 'Новый наряд', 'Comandă nouă'],
  edit_ot: ['Editar OT', 'Edit WO', 'Изменить наряд', 'Editează comanda'],
  ot: ['OT', 'WO', 'Наряд', 'Comandă'],
  ot_number: ['Nº de OT', 'WO number', '№ наряда', 'Nr. comandă'],
  description: ['Descripción', 'Description', 'Описание', 'Descriere'],
  client: ['Cliente', 'Client', 'Клиент', 'Client'],
  vessel: ['Buque', 'Vessel', 'Судно', 'Navă'],
  location: ['Ubicación', 'Location', 'Место', 'Locație'],
  status: ['Estado', 'Status', 'Статус', 'Stare'],
  status_open: ['Abierta', 'Open', 'Открыт', 'Deschisă'],
  status_closed: ['Cerrada', 'Closed', 'Закрыт', 'Închisă'],
  close_ot: ['Cerrar OT', 'Close WO', 'Закрыть наряд', 'Închide comanda'],
  reopen_ot: ['Reabrir OT', 'Reopen WO', 'Открыть наряд', 'Redeschide comanda'],
  confirm_close_ot: ['¿Cerrar la OT {ot}? Se retirará a todos los operarios asignados.', 'Close WO {ot}? All assigned workers will be removed.', 'Закрыть наряд {ot}? Все назначенные работники будут сняты.', 'Închideți comanda {ot}? Toți muncitorii alocați vor fi retrași.'],
  assigned_workers: ['Operarios asignados', 'Assigned workers', 'Назначенные работники', 'Muncitori alocați'],
  assign_worker: ['Asignar operario', 'Assign worker', 'Назначить работника', 'Alocă muncitor'],
  assign: ['Asignar', 'Assign', 'Назначить', 'Alocă'],
  remove_from_ot: ['Retirar', 'Remove', 'Снять', 'Retrage'],
  confirm_remove: ['¿Retirar a {name} de la OT {ot}? Si está fichado, se cerrará su fichaje.', 'Remove {name} from WO {ot}? An open record will be closed.', 'Снять {name} с наряда {ot}? Открытая смена будет закрыта.', 'Retrageți {name} de pe comanda {ot}? Pontajul deschis va fi închis.'],
  no_workers_assigned: ['Ningún operario asignado', 'No workers assigned', 'Нет назначенных работников', 'Niciun muncitor alocat'],
  assigned_since: ['Asignado desde', 'Assigned since', 'Назначен с', 'Alocat din'],
  history: ['Historial', 'History', 'История', 'Istoric'],
  removed_on: ['retirado', 'removed', 'снят', 'retras'],

  // Fichajes
  from: ['Desde', 'From', 'С', 'De la'],
  to: ['Hasta', 'To', 'По', 'Până la'],
  worker: ['Operario', 'Worker', 'Работник', 'Muncitor'],
  search: ['Buscar', 'Search', 'Найти', 'Caută'],
  status_pending: ['Pendiente', 'Pending', 'Ожидает', 'În așteptare'],
  status_verified: ['Verificado', 'Verified', 'Проверено', 'Verificat'],
  verify_selected: ['Verificar seleccionados', 'Verify selected', 'Подтвердить выбранные', 'Verifică selecția'],
  unverify_selected: ['Anular verificación', 'Unverify', 'Отменить проверку', 'Anulează verificarea'],
  add_entry: ['Añadir fichaje manual', 'Add manual record', 'Добавить вручную', 'Adaugă pontaj manual'],
  edit_entry: ['Editar fichaje', 'Edit record', 'Изменить отметку', 'Editează pontaj'],
  start: ['Entrada', 'In', 'Начало', 'Intrare'],
  end: ['Salida', 'Out', 'Конец', 'Ieșire'],
  hours: ['Horas', 'Hours', 'Часы', 'Ore'],
  date: ['Fecha', 'Date', 'Дата', 'Data'],
  note: ['Observaciones', 'Notes', 'Примечание', 'Observații'],
  manual: ['manual', 'manual', 'вручную', 'manual'],
  in_progress: ['En curso', 'In progress', 'В процессе', 'În curs'],
  confirm_delete_entry: ['¿Eliminar este fichaje? Quedará constancia en el registro de cambios.', 'Delete this record? It will be kept in the change log.', 'Удалить отметку? Это будет записано в журнал.', 'Ștergeți pontajul? Va rămâne în jurnal.'],
  no_entries: ['No hay fichajes en este periodo', 'No records in this period', 'Нет отметок за период', 'Nu există pontaje în perioadă'],
  edit_resets_verification: ['Modificar horas u OT anula la verificación.', 'Changing times or WO removes verification.', 'Изменение времени или наряда отменяет проверку.', 'Modificarea orelor sau a comenzii anulează verificarea.'],
  selected: ['seleccionados', 'selected', 'выбрано', 'selectate'],

  // Informes
  timesheet: ['Time sheet para cliente', 'Client time sheet', 'Табель для клиента', 'Fișă de pontaj pentru client'],
  timesheet_desc: ['Horas por OT para llevar a firmar al cliente de TMB.', 'Hours per WO to be signed by the TMB client.', 'Часы по наряду для подписи клиентом TMB.', 'Ore pe comandă, pentru semnătura clientului TMB.'],
  summary: ['Resumen para subcontrata', 'Subcontractor summary', 'Сводка для субподрядчика', 'Rezumat pentru subcontractor'],
  only_verified: ['Solo fichajes verificados', 'Verified records only', 'Только проверенные', 'Doar pontaje verificate'],
  generate: ['Generar', 'Generate', 'Сформировать', 'Generează'],
  export_csv: ['Exportar CSV', 'Export CSV', 'Экспорт CSV', 'Export CSV'],
  print_pdf: ['Imprimir / PDF', 'Print / PDF', 'Печать / PDF', 'Tipărire / PDF'],
  total_hours: ['Total horas', 'Total hours', 'Всего часов', 'Total ore'],
  choose_ot: ['Elige una OT', 'Choose a WO', 'Выберите наряд', 'Alegeți o comandă'],
  choose_company: ['Elige una empresa', 'Choose a company', 'Выберите компанию', 'Alegeți o companie'],
  popup_blocked: ['El navegador ha bloqueado la ventana del informe. Permite ventanas emergentes.', 'The browser blocked the report window. Allow pop-ups.', 'Браузер заблокировал окно отчёта. Разрешите всплывающие окна.', 'Browserul a blocat fereastra raportului. Permiteți ferestrele pop-up.'],
  action: ['Acción', 'Action', 'Действие', 'Acțiune'],
  by_user: ['Usuario', 'User', 'Пользователь', 'Utilizator'],
  detail: ['Detalle', 'Detail', 'Детали', 'Detalii'],

  // Lugar, capataz y festivos
  place: ['Lugar', 'Place', 'Место работы', 'Loc'],
  place_board: ['A bordo', 'On board', 'На борту', 'La bord'],
  place_workshop: ['Taller', 'Workshop', 'Мастерская', 'Atelier'],
  choose_place: ['¿Dónde trabajas?', 'Where are you working?', 'Где вы работаете?', 'Unde lucrați?'],
  foreman: ['Capataz', 'Foreman', 'Бригадир', 'Șef de echipă'],
  holidays: ['Festivos', 'Holidays', 'Праздники', 'Sărbători'],
  holidays_desc: ['Los sábados, domingos y estos días cuentan como «Holiday» en el time sheet. Las horas entre 22:00 y 06:00 de días laborables cuentan como «Night»; del resto, las 8 primeras del día son «Normal» y las demás «Overtime».', 'Saturdays, Sundays and these days count as "Holiday" in the time sheet. Hours between 22:00 and 06:00 on working days count as "Night"; of the rest, the first 8 of the day are "Normal" and the others "Overtime".', 'Субботы, воскресенья и эти дни считаются «Holiday» в табеле. Часы с 22:00 до 06:00 в рабочие дни — «Night»; из остальных первые 8 часов дня — «Normal», остальные — «Overtime».', 'Sâmbetele, duminicile și aceste zile se consideră „Holiday” în fișa de pontaj. Orele între 22:00 și 06:00 în zilele lucrătoare sunt „Night”; din rest, primele 8 ore ale zilei sunt „Normal”, iar celelalte „Overtime”.'],
  holiday_name: ['Nombre (opcional)', 'Name (optional)', 'Название (необязательно)', 'Denumire (opțional)'],
  add_holiday: ['Añadir festivo', 'Add holiday', 'Добавить праздник', 'Adaugă sărbătoare'],
  no_holidays: ['No hay festivos dados de alta', 'No holidays added', 'Праздники не добавлены', 'Nu există sărbători adăugate'],
  timesheet_english: ['Formato del cliente, en inglés. Horas redondeadas a la hora entera.', 'Client format, in English. Hours rounded to whole hours.', 'Формат клиента, на английском. Часы округлены до целых.', 'Formatul clientului, în engleză. Ore rotunjite la ora întreagă.'],

  // Hojas mensuales de subcontratas
  rank: ['Categoría (Rank)', 'Rank', 'Должность (Rank)', 'Funcție (Rank)'],
  imo: ['Nº IMO', 'IMO No.', '№ IMO', 'Nr. IMO'],
  flag: ['Bandera', 'Flag', 'Флаг', 'Pavilion'],
  month: ['Mes', 'Month', 'Месяц', 'Luna'],
  summary_formats: ['Una hoja por operario y mes, con el formato de cada subcontrata (SSPT: «Time Sheet»; UNICREW: «Attendance Timesheet»), en inglés. Solo fichajes verificados por TMB.', 'One sheet per worker and month, in each subcontractor\'s format (SSPT: "Time Sheet"; UNICREW: "Attendance Timesheet"), in English. Only records verified by TMB.', 'Один лист на работника за месяц, в формате каждого субподрядчика (SSPT: «Time Sheet»; UNICREW: «Attendance Timesheet»), на английском. Только проверенные TMB отметки.', 'O fișă pe muncitor și lună, în formatul fiecărui subcontractor (SSPT: „Time Sheet”; UNICREW: „Attendance Timesheet”), în engleză. Doar pontaje verificate de TMB.'],

  // Primera pantalla y ordenador de fichaje
  choose_language: ['Elige tu idioma', 'Choose your language', 'Выберите язык', 'Alegeți limba'],
  device_question: ['¿Dónde se usa la aplicación?', 'Where is the app used?', 'Где используется приложение?', 'Unde se folosește aplicația?'],
  device_mobile: ['Móvil o uso personal', 'Mobile or personal use', 'Мобильный / личное использование', 'Mobil sau uz personal'],
  device_mobile_desc: ['Tu teléfono, o el ordenador de oficina de los administradores. Se entra con usuario y contraseña.', 'Your phone, or the administrators\' office computer. Sign in with username and password.', 'Ваш телефон или офисный компьютер администратора. Вход по логину и паролю.', 'Telefonul dumneavoastră sau calculatorul de birou al administratorilor. Intrare cu utilizator și parolă.'],
  device_terminal: ['Ordenador de fichaje', 'Clock-in computer', 'Компьютер для отметок', 'Calculator de pontaj'],
  device_terminal_desc: ['Equipo compartido de la empresa. Lo configura un administrador.', 'Shared company computer. Set up by an administrator.', 'Общий компьютер компании. Настраивается администратором.', 'Calculator comun al firmei. Se configurează de un administrator.'],
  change_device: ['Cambiar idioma o dispositivo', 'Change language or device', 'Сменить язык или устройство', 'Schimbă limba sau dispozitivul'],
  terminal_setup: ['Configurar ordenador de fichaje', 'Set up clock-in computer', 'Настройка компьютера для отметок', 'Configurare calculator de pontaj'],
  terminal_setup_help: ['Solo un administrador de TMB puede convertir este ordenador en terminal de fichaje. Se hace una sola vez.', 'Only a TMB administrator can turn this computer into a clock-in terminal. It is done only once.', 'Только администратор TMB может сделать этот компьютер терминалом. Делается один раз.', 'Doar un administrator TMB poate transforma acest calculator în terminal de pontaj. Se face o singură dată.'],
  terminal_name: ['Nombre del terminal', 'Terminal name', 'Название терминала', 'Numele terminalului'],
  terminal_name_placeholder: ['Ej.: Entrada taller', 'E.g.: Workshop entrance', 'Напр.: Вход в мастерскую', 'Ex.: Intrare atelier'],
  configure: ['Configurar', 'Set up', 'Настроить', 'Configurează'],
  back: ['Volver', 'Back', 'Назад', 'Înapoi'],
  kiosk_tap_name: ['Toca tu nombre', 'Tap your name', 'Нажмите на своё имя', 'Atingeți numele dumneavoastră'],
  kiosk_no_workers: ['No hay operarios con OT asignada y PIN. Contacta con TMB.', 'No workers with an assigned WO and PIN. Contact TMB.', 'Нет работников с нарядом и PIN-кодом. Свяжитесь с TMB.', 'Nu există muncitori cu comandă alocată și PIN. Contactați TMB.'],
  kiosk_enter_pin: ['Introduce tu PIN', 'Enter your PIN', 'Введите PIN-код', 'Introduceți PIN-ul'],
  kiosk_done_in: ['Entrada registrada', 'Clock-in recorded', 'Начало смены записано', 'Intrare înregistrată'],
  kiosk_done_out: ['Salida registrada', 'Clock-out recorded', 'Окончание смены записано', 'Ieșire înregistrată'],
  kiosk_admin: ['Administración', 'Administration', 'Администрирование', 'Administrare'],
  exit_terminal: ['Quitar modo terminal en este ordenador', 'Remove terminal mode from this computer', 'Отключить режим терминала на этом компьютере', 'Scoate modul terminal de pe acest calculator'],
  terminals: ['Terminales', 'Terminals', 'Терминалы', 'Terminale'],
  terminals_desc: ['Ordenadores de la empresa configurados para fichar. Los operarios tocan su nombre y escriben su PIN de 4 cifras.', 'Company computers set up for clocking in. Workers tap their name and type their 4-digit PIN.', 'Компьютеры компании для отметок. Работник нажимает своё имя и вводит 4-значный PIN.', 'Calculatoare ale firmei configurate pentru pontaj. Muncitorii își ating numele și introduc PIN-ul de 4 cifre.'],
  setup_this_computer: ['Configurar este ordenador como terminal', 'Set up this computer as a terminal', 'Сделать этот компьютер терминалом', 'Configurează acest calculator ca terminal'],
  revoke: ['Desactivar', 'Deactivate', 'Отключить', 'Dezactivează'],
  confirm_revoke: ['¿Desactivar el terminal «{name}»? Dejará de poder usarse para fichar.', 'Deactivate terminal "{name}"? It will no longer be usable for clocking in.', 'Отключить терминал «{name}»? На нём больше нельзя будет отмечаться.', 'Dezactivați terminalul „{name}”? Nu se va mai putea ponta pe el.'],
  last_used: ['Último uso', 'Last used', 'Последнее использование', 'Ultima utilizare'],
  no_terminals: ['No hay terminales configurados', 'No terminals set up', 'Терминалы не настроены', 'Nu există terminale configurate'],
  pin: ['PIN (4 cifras)', 'PIN (4 digits)', 'PIN (4 цифры)', 'PIN (4 cifre)'],
  pin_help: ['PIN para el ordenador de fichaje (vacío = sin cambios)', 'PIN for the clock-in computer (blank = keep)', 'PIN для компьютера отметок (пусто = без изменений)', 'PIN pentru calculatorul de pontaj (gol = neschimbat)'],
  no_pin: ['sin PIN', 'no PIN', 'без PIN', 'fără PIN'],

  // Errores
  err_unauthorized: ['Sesión caducada. Vuelve a entrar.', 'Session expired. Please sign in again.', 'Сессия истекла. Войдите снова.', 'Sesiunea a expirat. Autentificați-vă din nou.'],
  err_invalid_credentials: ['Usuario o contraseña incorrectos', 'Wrong username or password', 'Неверный логин или пароль', 'Utilizator sau parolă greșită'],
  err_too_many_attempts: ['Demasiados intentos. Espera 15 minutos.', 'Too many attempts. Wait 15 minutes.', 'Слишком много попыток. Подождите 15 минут.', 'Prea multe încercări. Așteptați 15 minute.'],
  err_not_assigned: ['No estás asignado a esta OT', 'You are not assigned to this WO', 'Вы не назначены на этот наряд', 'Nu sunteți alocat acestei comenzi'],
  err_already_clocked_in: ['Ya tienes un fichaje abierto', 'You are already clocked in', 'Смена уже начата', 'Aveți deja un pontaj deschis'],
  err_not_clocked_in: ['No tienes ningún fichaje abierto', 'You are not clocked in', 'Нет открытой смены', 'Nu aveți niciun pontaj deschis'],
  err_entry_overlap: ['El fichaje se solapa con otro del mismo operario', 'The record overlaps another one of the same worker', 'Отметка пересекается с другой отметкой работника', 'Pontajul se suprapune cu altul al aceluiași muncitor'],
  err_username_taken: ['Ese usuario ya existe', 'That username already exists', 'Такой логин уже существует', 'Utilizatorul există deja'],
  err_ot_number_taken: ['Ese número de OT ya existe', 'That WO number already exists', 'Такой номер наряда уже существует', 'Numărul de comandă există deja'],
  err_password_too_short: ['La contraseña debe tener al menos 4 caracteres', 'Password must be at least 4 characters', 'Пароль должен быть не короче 4 символов', 'Parola trebuie să aibă minim 4 caractere'],
  err_end_before_start: ['La salida debe ser posterior a la entrada', 'Out must be after In', 'Конец должен быть позже начала', 'Ieșirea trebuie să fie după intrare'],
  err_end_required: ['Indica la hora de salida', 'Enter the out time', 'Укажите время окончания', 'Indicați ora de ieșire'],
  err_already_assigned: ['El operario ya está asignado a esta OT', 'Worker already assigned to this WO', 'Работник уже назначен на этот наряд', 'Muncitorul este deja alocat'],
  err_cannot_demote_self: ['No puedes quitarte tus propios permisos de administrador', 'You cannot remove your own admin rights', 'Нельзя снять с себя права администратора', 'Nu vă puteți elimina propriile drepturi de administrator'],
  err_place_required: ['Elige si trabajas a bordo o en taller', 'Choose on board or workshop', 'Выберите: на борту или в мастерской', 'Alegeți la bord sau în atelier'],
  err_invalid_pin: ['PIN incorrecto', 'Wrong PIN', 'Неверный PIN', 'PIN greșit'],
  err_pin_locked: ['Demasiados intentos. Espera 15 minutos o avisa a TMB.', 'Too many attempts. Wait 15 minutes or tell TMB.', 'Слишком много попыток. Подождите 15 минут или сообщите TMB.', 'Prea multe încercări. Așteptați 15 minute sau anunțați TMB.'],
  err_invalid_pin_format: ['El PIN debe tener 4 cifras', 'The PIN must have 4 digits', 'PIN должен состоять из 4 цифр', 'PIN-ul trebuie să aibă 4 cifre'],
  err_terminal_unauthorized: ['Este ordenador ya no está autorizado como terminal', 'This computer is no longer authorised as a terminal', 'Этот компьютер больше не авторизован как терминал', 'Acest calculator nu mai este autorizat ca terminal'],
  err_forbidden: ['Solo un administrador de TMB puede hacer esto', 'Only a TMB administrator can do this', 'Это может сделать только администратор TMB', 'Doar un administrator TMB poate face acest lucru'],
  err_network: ['Sin conexión con el servidor', 'No connection to the server', 'Нет связи с сервером', 'Fără conexiune la server'],
  err_generic: ['Error: revisa los datos', 'Error: check the data', 'Ошибка: проверьте данные', 'Eroare: verificați datele'],
};

let currentLang = 'es';

const detectLang = () => {
  try {
    const stored = localStorage.getItem('tmb_fichaje_lang');
    if (LANGS.includes(stored)) return stored;
  } catch { /* almacenamiento no disponible */ }
  const browser = (navigator.language || 'es').slice(0, 2);
  return LANGS.includes(browser) ? browser : 'es';
};

const setLang = (lang) => {
  currentLang = LANGS.includes(lang) ? lang : 'es';
  document.documentElement.lang = currentLang;
  try { localStorage.setItem('tmb_fichaje_lang', currentLang); } catch { /* sin almacenamiento */ }
};

const tr = (key, vars = {}, lang = currentLang) => {
  const row = T[key];
  const text = row ? row[LANGS.indexOf(lang)] : key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
};
