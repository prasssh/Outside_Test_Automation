export function getPages(baseUrl: string) {
  return [
    {
      name: 'Homepage',
      url: `${baseUrl}/`,
      screenshot: 'homepage.png',
    },
    {
      name: 'About',
      url: `${baseUrl}/about/`,
      screenshot: 'about.png',
    },
    {
      name: 'Team - Chad Wanless',
      url: `${baseUrl}/team/chad-wanless/`,
      screenshot: 'team-chad-wanless.png',
    },
    {
      name: 'Case Study - Signal to Service',
      url: `${baseUrl}/case-study/signal-to-service/`,
      screenshot: 'case-study-signal-to-service.png',
    },
  ];
}
