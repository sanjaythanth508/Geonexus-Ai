from apps.geochat.services.chat import chat
import sys

def main():
    try:
        answer, history = chat("What environmental clearances are needed for a chemical industry unit in Gujarat?")
        print("\n\n--- ANSWER ---\n")
        print(answer)
        print("\n--- END ANSWER ---\n")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
