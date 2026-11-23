const SUB_COMMAND = 1;
const INTEGER = 4;
const USER = 6;
const CHANNEL = 7;

const GUILD_TEXT = 0;
const GUILD_ANNOUNCEMENT = 5;

const MANAGE_GUILD = 1 << 5;

const MONTH_CHOICES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
].map((name, i) => ({ name, value: i + 1 }));

const dayOption = { type: INTEGER, name: "dia", description: "Día del mes", required: true, min_value: 1, max_value: 31 };
const monthOption = { type: INTEGER, name: "mes", description: "Mes", required: true, choices: MONTH_CHOICES };

export const COMMANDS = [
  {
    name: "cumple",
    description: "Cumpleaños del servidor",
    dm_permission: false,
    options: [
      { type: SUB_COMMAND, name: "registrar", description: "Registra tu cumpleaños", options: [dayOption, monthOption] },
      { type: SUB_COMMAND, name: "borrar", description: "Borra tu cumpleaños" },
      {
        type: SUB_COMMAND,
        name: "lista",
        description: "Muestra los cumpleaños del servidor",
        options: [{ ...monthOption, required: false, description: "Solo un mes (por defecto, todos)" }],
      },
    ],
  },
  {
    name: "cumple-admin",
    description: "Administrar los cumpleaños del servidor",
    dm_permission: false,
    default_member_permissions: String(MANAGE_GUILD),
    options: [
      {
        type: SUB_COMMAND,
        name: "agregar",
        description: "Registra o cambia el cumpleaños de alguien",
        options: [{ type: USER, name: "usuario", description: "Cumpleañero", required: true }, dayOption, monthOption],
      },
      {
        type: SUB_COMMAND,
        name: "quitar",
        description: "Borra el cumpleaños de alguien",
        options: [{ type: USER, name: "usuario", description: "A quién borrar", required: true }],
      },
      {
        type: SUB_COMMAND,
        name: "canal",
        description: "Elige el canal donde se publican los saludos",
        options: [
          {
            type: CHANNEL,
            name: "canal",
            description: "Canal de los saludos",
            required: true,
            channel_types: [GUILD_TEXT, GUILD_ANNOUNCEMENT],
          },
        ],
      },
      { type: SUB_COMMAND, name: "probar", description: "Manda un saludo de prueba al canal, etiquetándote a ti" },
    ],
  },
];
