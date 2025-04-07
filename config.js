
export const ticketCategories = [
  {
    label: 'GENERAL SUPPORT',
    value: 'general_support',
    emoji: '<a:support:1353334302036856885>',
    folderId: process.env.CATEGORY_GENERAL_SUPPORT
  },
  {
    label: 'PLAYER REPORT',
    value: 'player_report',
    emoji: '<:barrier:1304789987954262046>',
    folderId: process.env.CATEGORY_PLAYER_REPORT
  },
  {
    label: 'BUY',
    value: 'buy',
    emoji: '<a:Cart:1357966551508324492>',
    folderId: process.env.CATEGORY_BUY
  },
  {
    label: 'CLAIMING',
    value: 'claiming',
    emoji: '<a:Gift:1353330955535908925>',
    folderId: process.env.CATEGORY_CLAIMING
  },
  {
    label: 'ISSUES',
    value: 'issues',
    emoji: '<a:notepad_gif:1296821272424218715>',
    folderId: process.env.CATEGORY_ISSUES
  }
];

export const questionFlows = {
  general_support: [
    {
      label: "What's Your Minecraft Username?",
      placeholder: "Your In game name",
      customId: "username",
      required: true
    },
    {
      label: "What is the issue you are facing?",
      placeholder: "Describe the issue",
      customId: "issue",
      required: true
    },
    {
      label: "What's your Platform?",
      placeholder: "Java / PE / Bedrock",
      customId: "platform",
      required: true
    }
  ],
  player_report: [
    {
      label: "What's Your Minecraft Username?",
      placeholder: "Your In game name",
      customId: "username",
      required: true
    },
    {
      label: "Whom are you reporting?",
      placeholder: "His username (IGN)",
      customId: "reported_player",
      required: true
    },
    {
      label: "What did he do?",
      placeholder: "Describe the violation",
      customId: "violation",
      required: true
    },
    {
      label: "Do you have any proof?",
      placeholder: "Yes / No",
      customId: "proof",
      required: true
    }
  ],
  buy: [
    {
      label: "What's Your Minecraft Username?",
      placeholder: "Your In game name",
      customId: "username",
      required: true
    },
    {
      label: "What would you like to buy?",
      placeholder: "Enter the product/service",
      customId: "item",
      required: true
    },
    {
      label: "What's your Payment Method?",
      placeholder: "UPI / PayPal / etc.",
      customId: "payment",
      required: true
    }
  ],
  claiming: [
    {
      label: "What's Your Minecraft Username?",
      placeholder: "Your In game name",
      customId: "username",
      required: true
    },
    {
      label: "What did you win?",
      placeholder: "Give details",
      customId: "reward",
      required: true
    },
    {
      label: "Do you have any proof?",
      placeholder: "Yes / No",
      customId: "proof",
      required: true
    }
  ],
  issues: [
    {
      label: "What's Your Minecraft Username?",
      placeholder: "Your In game name",
      customId: "username",
      required: true
    },
    {
      label: "What's the issue you are facing?",
      placeholder: "Describe the issue",
      customId: "issue",
      required: true
    },
    {
      label: "What's your platform?",
      placeholder: "Java / PE / Bedrock",
      customId: "platform",
      required: true
    }
  ]
};
