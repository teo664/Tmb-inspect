const CHECKLIST_DATA = [
  {
    id: 'safety',
    icon: '⛑️',
    title: 'Seguridad / Safety',
    items: [
      { id: 's1', text: 'EPIs disponibles y en buen estado', en: 'PPE available and in good condition' },
      { id: 's2', text: 'Permiso de trabajo firmado y vigente', en: 'Work permit signed and valid' },
      { id: 's3', text: 'Procedimientos de emergencia conocidos por el equipo', en: 'Emergency procedures known by team' },
      { id: 's4', text: 'Extintores operativos y accesibles en zona de trabajo', en: 'Fire extinguishers operational and accessible' },
      { id: 's5', text: 'Vías de escape despejadas y señalizadas', en: 'Escape routes clear and marked' },
      { id: 's6', text: 'Iluminación adecuada en la zona de trabajo', en: 'Adequate lighting in work area' },
      { id: 's7', text: 'Detector de gas disponible (espacios confinados)', en: 'Gas detector available (confined spaces)' },
      { id: 's8', text: 'Permiso de trabajo en espacios confinados si aplica', en: 'Confined space entry permit if applicable' },
    ]
  },
  {
    id: 'hull',
    icon: '🚢',
    title: 'Casco y Estructura / Hull & Structure',
    items: [
      { id: 'h1', text: 'Condición general de la pintura del casco', en: 'General hull paint condition acceptable' },
      { id: 'h2', text: 'Ausencia de corrosión severa o picaduras profundas', en: 'No severe corrosion or deep pitting' },
      { id: 'h3', text: 'Sin daños estructurales visibles (abolladuras, grietas)', en: 'No visible structural damage (dents, cracks)' },
      { id: 'h4', text: 'Estado de soldaduras en zonas críticas aceptable', en: 'Welds in critical areas in good condition' },
      { id: 'h5', text: 'Ánodos de sacrificio en estado aceptable', en: 'Sacrificial anodes in acceptable condition' },
      { id: 'h6', text: 'Cajas de mar sin obstrucciones ni corrosión', en: 'Sea chests unobstructed and free of corrosion' },
      { id: 'h7', text: 'Bocina / tubo de bocina sin signos de fuga', en: 'Stern tube / shaft seal no visible leaks' },
      { id: 'h8', text: 'Timón y mecha del timón en buen estado', en: 'Rudder and rudder stock in good condition' },
    ]
  },
  {
    id: 'deck',
    icon: '⚓',
    title: 'Cubierta / Deck',
    items: [
      { id: 'd1', text: 'Estado general de la cubierta aceptable', en: 'General deck condition acceptable' },
      { id: 'd2', text: 'Escotillas y tapas en buen estado y estancas', en: 'Hatches and covers in good condition and watertight' },
      { id: 'd3', text: 'Barandillas, candeleros y tensores en buen estado', en: 'Railings, stanchions and wire ropes in good condition' },
      { id: 'd4', text: 'Equipo de amarre (bitas, guías, roldanas) operativo', en: 'Mooring equipment (bollards, fairleads, rollers) operational' },
      { id: 'd5', text: 'Anclas y cadenas en buen estado', en: 'Anchors and anchor chains in good condition' },
      { id: 'd6', text: 'Winches y maquinillas de amarre operativos', en: 'Mooring winches and windlasses operational' },
      { id: 'd7', text: 'Grúas y plumas en buen estado (si aplica)', en: 'Cranes and derricks in good condition (if applicable)' },
      { id: 'd8', text: 'Sistema de achique de cubierta sin obstrucciones', en: 'Deck drainage system unobstructed' },
    ]
  },
  {
    id: 'machinery',
    icon: '⚙️',
    title: 'Maquinaria Principal / Main Machinery',
    items: [
      { id: 'm1', text: 'Estado general del motor principal aceptable', en: 'Main engine general condition acceptable' },
      { id: 'm2', text: 'Caja reductora sin fugas de aceite ni ruidos anómalos', en: 'Gearbox no oil leaks or abnormal noises' },
      { id: 'm3', text: 'Hélice sin daños visibles (cavitación, golpes)', en: 'Propeller no visible damage (cavitation, impact)' },
      { id: 'm4', text: 'Sistema de combustible sin fugas', en: 'Fuel system no leaks' },
      { id: 'm5', text: 'Sistema de refrigeración operativo', en: 'Cooling system operational' },
      { id: 'm6', text: 'Sistema de lubricación sin fugas', en: 'Lubrication system no leaks' },
      { id: 'm7', text: 'Sistema de escape en buen estado', en: 'Exhaust system in good condition' },
      { id: 'm8', text: 'Sin vibraciones anómalas detectadas', en: 'No abnormal vibrations detected' },
    ]
  },
  {
    id: 'auxiliary',
    icon: '🔧',
    title: 'Sistemas Auxiliares / Auxiliary Systems',
    items: [
      { id: 'a1', text: 'Generadores auxiliares operativos', en: 'Auxiliary generators operational' },
      { id: 'a2', text: 'Bombas de lastre/sentinas operativas', en: 'Ballast/bilge pumps operational' },
      { id: 'a3', text: 'Separador de aguas aceitosas operativo', en: 'Oily water separator operational' },
      { id: 'a4', text: 'Sistema de gobierno operativo y sin juego excesivo', en: 'Steering system operational, no excessive play' },
      { id: 'a5', text: 'Compresor de aire en buen estado', en: 'Air compressor in good condition' },
      { id: 'a6', text: 'Sistema hidráulico sin fugas', en: 'Hydraulic system no leaks' },
      { id: 'a7', text: 'Tuberías y válvulas de mar en buen estado', en: 'Seawater pipework and sea valves in good condition' },
    ]
  },
  {
    id: 'electrical',
    icon: '⚡',
    title: 'Sistema Eléctrico / Electrical Systems',
    items: [
      { id: 'e1', text: 'Panel eléctrico principal en buen estado', en: 'Main electrical panel in good condition' },
      { id: 'e2', text: 'Generador de emergencia operativo', en: 'Emergency generator operational' },
      { id: 'e3', text: 'Luces de navegación operativas', en: 'Navigation lights operational' },
      { id: 'e4', text: 'Cableado sin daños visibles, fijaciones adecuadas', en: 'No visible cable damage, adequate fixings' },
      { id: 'e5', text: 'Toma de corriente en tierra en buen estado', en: 'Shore power connection in good condition' },
      { id: 'e6', text: 'Baterías de arranque en buen estado', en: 'Starting batteries in good condition' },
    ]
  },
  {
    id: 'engine_room',
    icon: '🏭',
    title: 'Sala de Máquinas / Engine Room',
    items: [
      { id: 'er1', text: 'Nivel de sentinas aceptable', en: 'Bilge level acceptable' },
      { id: 'er2', text: 'Sin fugas de aceite en maquinaria', en: 'No oil leaks in machinery' },
      { id: 'er3', text: 'Sin fugas de combustible', en: 'No fuel leaks' },
      { id: 'er4', text: 'Ventilación de sala de máquinas adecuada', en: 'Engine room ventilation adequate' },
      { id: 'er5', text: 'Equipos contraincendios presentes y operativos', en: 'Firefighting equipment present and operational' },
      { id: 'er6', text: 'Limpieza general de sala de máquinas aceptable', en: 'Engine room general cleanliness acceptable' },
    ]
  },
  {
    id: 'safety_equip',
    icon: '🦺',
    title: 'Equipos de Salvamento / Life-Saving Equipment',
    items: [
      { id: 'se1', text: 'Balsas salvavidas en buen estado y certificadas', en: 'Life rafts in good condition and certified' },
      { id: 'se2', text: 'Botes de rescate operativos (si aplica)', en: 'Rescue boats operational (if applicable)' },
      { id: 'se3', text: 'Chalecos salvavidas suficientes y en buen estado', en: 'Sufficient life jackets in good condition' },
      { id: 'se4', text: 'Aros salvavidas presentes y accesibles', en: 'Lifebuoys present and accessible' },
      { id: 'se5', text: 'Bengalas y señales pirotécnicas vigentes', en: 'Flares and pyrotechnics within expiry date' },
      { id: 'se6', text: 'EPIRB/SART operativo y dentro de fecha (si aplica)', en: 'EPIRB/SART operational and within expiry (if applicable)' },
    ]
  },
  {
    id: 'accommodation',
    icon: '🛏️',
    title: 'Habitabilidad / Accommodation',
    items: [
      { id: 'ac1', text: 'Estado general de camarotes aceptable', en: 'General cabin condition acceptable' },
      { id: 'ac2', text: 'Cocina y comedor en buen estado', en: 'Galley and mess room in good condition' },
      { id: 'ac3', text: 'Aseos y baños en buen estado', en: 'Toilets and bathrooms in good condition' },
      { id: 'ac4', text: 'Sistema de agua dulce operativo', en: 'Fresh water system operational' },
      { id: 'ac5', text: 'Sistema de climatización operativo (si aplica)', en: 'HVAC system operational (if applicable)' },
    ]
  },
];
