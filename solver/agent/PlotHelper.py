import matplotlib.pyplot as plt

class PlotHelper():
    def __init__(self):
        self.fig = None
        self.ax = None
        plt.ion()

    def Get_figure(self):
        if self.fig is None or self.ax is None:
            self.fig, self.ax = plt.subplots(figsize=(12, 8))
        return self.fig,self.ax
    
    def keep_plot_open(self):
        plt.ioff()
        plt.show()

    def Plot_laptimes(self,times,driver_number):
        fig,ax = self.Get_figure()
        ax.set_xlabel("Laps")
        ax.set_ylabel("LapTimes")
        ax.set_title("LapTime Chart")
        ax.grid(True)

        ax.scatter(range(len(times)), times, label=f"Driver {driver_number}")
        ax.legend()
    
        fig.canvas.draw()
        fig.canvas.flush_events()



