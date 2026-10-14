// TMB Fichaje — clasificación de horas para el time sheet de cliente.
// Reglas (por operario y día, según el día en que empieza cada fichaje):
//  - Holiday: todo lo trabajado en sábado, domingo o festivo dado de alta por TMB.
//  - Night:   minutos trabajados entre NIGHT_START y NIGHT_END en días laborables.
//  - Normal:  resto de minutos hasta completar NORMAL_DAILY_MINUTES en el día (sumando a bordo y taller).
//  - Overtime: lo que pasa de ese límite.
// Cada bloque se separa en On board / Workshop según lo elegido al fichar.
const HOUR_RULES = { NORMAL_DAILY_MINUTES: 8 * 60, NIGHT_START: 22, NIGHT_END: 6 };
const HOUR_CATEGORIES = ['normal', 'overtime', 'holiday', 'night'];
const PLACES = ['board', 'workshop'];

const dateKeyOf = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const emptyBuckets = () => Object.fromEntries(PLACES.map((place) => [place, Object.fromEntries(HOUR_CATEGORIES.map((c) => [c, 0]))]));

const isNightMinute = (date) => {
  const hour = date.getHours();
  return hour >= HOUR_RULES.NIGHT_START || hour < HOUR_RULES.NIGHT_END;
};

// Devuelve, para cada fichaje cerrado, sus minutos por lugar y categoría: Map<entryId, buckets>.
const classifyEntries = (entries, holidayKeys = new Set()) => {
  const result = new Map();
  const closed = entries.filter((e) => e.end_at).sort((a, b) => a.start_at.localeCompare(b.start_at));
  const normalUsed = new Map(); // `${user_id}|${día}` → minutos normales ya consumidos

  for (const entry of closed) {
    const buckets = emptyBuckets();
    const start = new Date(entry.start_at);
    const dayKey = dateKeyOf(start);
    const weekday = start.getDay();
    const isHoliday = weekday === 0 || weekday === 6 || holidayKeys.has(dayKey);
    const usedKey = `${entry.user_id}|${dayKey}`;
    const place = PLACES.includes(entry.place) ? entry.place : 'board';
    const totalMinutes = Math.round((Date.parse(entry.end_at) - start.getTime()) / 60000);

    for (let i = 0; i < totalMinutes; i += 1) {
      const minute = new Date(start.getTime() + i * 60000);
      if (isHoliday) {
        buckets[place].holiday += 1;
      } else if (isNightMinute(minute)) {
        buckets[place].night += 1;
      } else if ((normalUsed.get(usedKey) || 0) < HOUR_RULES.NORMAL_DAILY_MINUTES) {
        buckets[place].normal += 1;
        normalUsed.set(usedKey, (normalUsed.get(usedKey) || 0) + 1);
      } else {
        buckets[place].overtime += 1;
      }
    }
    result.set(entry.id, buckets);
  }
  return result;
};

// Agrupa por operario y día sumando minutos, y redondea cada casilla a la hora entera.
// El total de la fila es la suma de las casillas redondeadas, para que cuadre a la vista.
const timesheetRows = (entries, classified) => {
  const rows = new Map();
  for (const entry of entries) {
    const buckets = classified.get(entry.id);
    if (!buckets) continue;
    const dayKey = dateKeyOf(new Date(entry.start_at));
    const key = `${dayKey}|${entry.user_id}`;
    if (!rows.has(key)) {
      rows.set(key, { dayKey, user_id: entry.user_id, user_name: entry.user_name, is_foreman: Boolean(entry.is_foreman), minutes: emptyBuckets() });
    }
    const row = rows.get(key);
    row.is_foreman ||= Boolean(entry.is_foreman);
    for (const place of PLACES) for (const c of HOUR_CATEGORIES) row.minutes[place][c] += buckets[place][c];
  }
  return [...rows.values()]
    .map((row) => {
      const hours = emptyBuckets();
      let total = 0;
      for (const place of PLACES) {
        for (const c of HOUR_CATEGORIES) {
          hours[place][c] = Math.round(row.minutes[place][c] / 60);
          total += hours[place][c];
        }
      }
      return { ...row, hours, total };
    })
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey) || a.user_name.localeCompare(b.user_name));
};

if (typeof module !== 'undefined') module.exports = { classifyEntries, timesheetRows, HOUR_RULES, HOUR_CATEGORIES, PLACES };
