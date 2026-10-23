function createDashboardController(dashboardService) {
  return {
    async getSnapshot(request, response, next) {
      try {
        return response.json(await dashboardService.getSnapshot(request.dashboardMonth));
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createDashboardController };
