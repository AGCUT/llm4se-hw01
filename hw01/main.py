import sys
from app.ui import WatermarkApp


def main() -> None:
    app = WatermarkApp()
    sys.exit(app.run())


if __name__ == "__main__":
    main()


