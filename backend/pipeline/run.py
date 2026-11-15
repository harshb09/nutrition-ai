import sys
import os

# Ensure backend directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from pipeline.export_artifacts import execute_pipeline

def main():
    root_dir = os.path.dirname(backend_dir)
    raw_dir = os.path.join(root_dir, "data", "raw")
    artifacts_dir = os.path.join(backend_dir, "artifacts")
    print("=" * 60)
    print("Starting Nutrition Atlas Pipeline Execution")
    print(f"Raw data directory: {raw_dir}")
    print(f"Artifacts output directory: {artifacts_dir}")
    print("=" * 60)
    execute_pipeline(raw_dir=raw_dir, artifacts_dir=artifacts_dir)
    print("Pipeline run completed successfully.")

if __name__ == "__main__":
    main()
