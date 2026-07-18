import { Page } from "@playwright/test";

export class UserManagementPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto("https://mahrosan.github.io/buggyUserManagement/");
  }

  async clickUserManagement() {
    await this.page.getByText("User Management").click();
  }

  async addUser(fullName: string, email: string, role: string, status: string) {
    await this.page.getByRole("button", { name: "＋ Add User" }).click();
    await this.page.getByRole("textbox", { name: "Full Name" }).fill(fullName);
    await this.page.getByRole("textbox", { name: "Email Address" }).fill(email);
    await this.page.getByLabel("Role").selectOption(role);
    await this.page.getByLabel("Status").selectOption(status);
    await this.page.getByRole("button", { name: "Create User" }).click();
  }

  async searchUser(name: string) {
    await this.page
      .getByRole("textbox", { name: "Search users by name or email…" })
      .fill(name);
    await this.page
      .getByRole("textbox", { name: "Search users by name or email…" })
      .press("Enter");
  }

  async viewUser() {
    await this.page.getByRole("button", { name: "View" }).click();
  }

  async closeView() {
    await this.page.getByRole("button", { name: "Close" }).click();
  }

  async editUser(newName: string, status: string) {
    await this.page.getByRole("button", { name: "Edit" }).click();
    await this.page.getByRole("textbox", { name: "Full Name" }).fill(newName);
    await this.page.getByLabel("Status").selectOption(status);
    await this.page.getByRole("button", { name: "Save Changes" }).click();
  }

  async confirmEditSuccess() {
    await this.page.getByText("✓ User updated successfully").click();
  }

  async deleteUser() {
    await this.page.getByRole("button", { name: "Delete" }).click();
    await this.page
      .locator("#confirm-bg")
      .getByRole("button", { name: "Delete" })
      .click();
  }

  async confirmDeleteSuccess() {
    await this.page.getByText("✓ User deleted").click();
  }

  async clearSearch() {
    await this.page
      .getByRole("textbox", { name: "Search users by name or email…" })
      .fill("");
  }
}
